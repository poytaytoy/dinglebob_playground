import hashlib
import os
import subprocess
import shutil
import uuid
import asyncio
import tempfile
from typing import List, Optional, Literal
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()

# Serve static files if the directory exists (Docker)
if os.path.exists("static"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    return {"message": "DingleBob Backend Running (Frontend not built)"}


# Configuration
EXEC_BASE = "exec"
BINARY_PATH = "./DingleBob/target/release/dinglebob"

# Ensure the base execution directory exists
os.makedirs(EXEC_BASE, exist_ok=True)

# --- Pydantic Models for Tree ---

class FileNode(BaseModel):
    id: str
    name: str
    type: Literal['file', 'folder']
    content: Optional[str] = None
    children: Optional[List['FileNode']] = None

class ExecutionRequest(BaseModel):
    files: List[FileNode]

class ExecutionResponse(BaseModel):
    output: str
    files: List[FileNode]

# --- Helper Functions ---

def recreate_fs_from_tree(base_path: str, nodes: List[FileNode]):
    """Recursively writes the JSON tree to disk."""
    for node in nodes:
        full_path = os.path.join(base_path, node.name)
        if node.type == 'folder':
            os.makedirs(full_path, exist_ok=True)
            if node.children:
                recreate_fs_from_tree(full_path, node.children)
        elif node.type == 'file':
            with open(full_path, 'w') as f:
                f.write(node.content if node.content else "")

def scan_fs_to_tree(base_path: str) -> List[FileNode]:
    """Recursively scans disk to build JSON tree."""
    nodes = []
    
    if not os.path.exists(base_path):
        return []

    with os.scandir(base_path) as entries:
        # Sort for consistent order
        for entry in sorted(entries, key=lambda e: e.name):
            if entry.name.startswith('.'): continue # Skip hidden
            
            node = FileNode(
                id=str(uuid.uuid4()), # Generate new IDs for now (stateless backend)
                name=entry.name,
                type='folder' if entry.is_dir() else 'file'
            )
            
            if entry.is_dir():
                node.children = scan_fs_to_tree(entry.path)
            else:
                try:
                    with open(entry.path, 'r') as f:
                        node.content = f.read()
                except:
                    node.content = "[Binary or Non-UTF8]"
            
            nodes.append(node)
            
    return nodes

def clean_output(text: str) -> str:
    import re
    ansi_escape = re.compile(r'(?:\x1B[@-_]|[\x80-\x9F])[0-?]*[ -/]*[@-~]')
    return ansi_escape.sub('', text)

@app.post("/submit", response_model=ExecutionResponse)
async def submit_code(request: ExecutionRequest):
    # 1. Create unique isolation sandbox
    sandbox_id = str(uuid.uuid4())
    sandbox_path = os.path.join(EXEC_BASE, sandbox_id)
    os.makedirs(sandbox_path, exist_ok=True)
    
    output = ""
    
    try:
        # 2. Write File System
        recreate_fs_from_tree(sandbox_path, request.files)
        
        # 3. Determine Entry Point (main.dingle)
        main_path = os.path.join(sandbox_path, "main.dingle")
        
        if not os.path.exists(main_path):
            output = "Error: main.dingle not found in root."
        else:
            # 4. Execute
            result = subprocess.run(
                [os.path.abspath(BINARY_PATH), "main.dingle"],
                cwd=os.path.abspath(sandbox_path),
                capture_output=True,
                text=True
            )
            
            raw = result.stdout if result.returncode == 0 else result.stderr
            output = clean_output(raw)
            
        # 5. Read back new state
        new_tree = scan_fs_to_tree(sandbox_path)
        
    except Exception as e:
        if os.path.exists(sandbox_path):
             shutil.rmtree(sandbox_path)
        raise HTTPException(status_code=500, detail=f"Internal Execution Error: {str(e)}")
        
    finally:
        # 6. Cleanup
        if os.path.exists(sandbox_path):
             shutil.rmtree(sandbox_path)
             
    return ExecutionResponse(output=output, files=new_tree)

def cleanup_temp_dirs(paths: List[str]):
    """Cleans up temporary directories."""
    for path in paths:
        if os.path.exists(path):
            try:
                shutil.rmtree(path)
            except Exception as e:
                print(f"Error cleaning up {path}: {e}")

@app.post("/download_zip")
async def download_zip(request: ExecutionRequest, background_tasks: BackgroundTasks):
    source_dir = tempfile.mkdtemp()
    zip_dir = tempfile.mkdtemp()
    
    try:
        # 1. Recreate FS in source_dir
        recreate_fs_from_tree(source_dir, request.files)
        
        # 2. Create ZIP
        base_name = os.path.join(zip_dir, "dinglebob-project")
        zip_path = shutil.make_archive(base_name, 'zip', source_dir)
        
        # 3. Schedule cleanup
        background_tasks.add_task(cleanup_temp_dirs, [source_dir, zip_dir])
        
        return FileResponse(zip_path, filename="dinglebob-project.zip", media_type="application/zip")
        
    except Exception as e:
        cleanup_temp_dirs([source_dir, zip_dir])
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/submit")
async def websocket_submit(websocket: WebSocket):
    await websocket.accept()
    sandbox_path = None
    process = None
    
    try:
        # 1. Receive Execution Context
        data = await websocket.receive_json()
        request = ExecutionRequest(**data)
        
        # 2. Setup Sandbox
        sandbox_id = str(uuid.uuid4())
        sandbox_path = os.path.join(EXEC_BASE, sandbox_id)
        os.makedirs(sandbox_path, exist_ok=True)
        
        recreate_fs_from_tree(sandbox_path, request.files)
        main_path = os.path.join(sandbox_path, "main.dingle")
        
        if not os.path.exists(main_path):
             await websocket.send_json({"type": "stderr", "data": "Error: main.dingle not found in root.\n"})
             await websocket.send_json({"type": "result", "files": request.files})
             return

        # 3. Async Execution
        process = await asyncio.create_subprocess_exec(
            os.path.abspath(BINARY_PATH), "main.dingle",
            cwd=os.path.abspath(sandbox_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        # Helper to read stream
        async def read_stream(stream, type_):
            while True:
                line = await stream.readline()
                if not line:
                    break
                text = line.decode('utf-8', errors='replace')
                await websocket.send_json({"type": type_, "data": clean_output(text)})

        await asyncio.gather(
            read_stream(process.stdout, "stdout"),
            read_stream(process.stderr, "stderr")
        )
        
        await process.wait()
        
        # 4. Return Final State
        new_tree = scan_fs_to_tree(sandbox_path)
        # Convert Pydantic models to dicts for JSON serialization
        new_tree_dicts = [node.model_dump() for node in new_tree]
        await websocket.send_json({"type": "result", "files": new_tree_dicts})
        
    except WebSocketDisconnect:
        print(f"Client disconnected")
        if process and process.returncode is None:
            print("Killing process...")
            try:
                process.terminate()
                await process.wait()
            except Exception as e:
                print(f"Error killing process: {e}")

    except Exception as e:
        # Check if connection is still open before sending error
        # (It might be closed if that's what caused the exception)
        try:
             await websocket.send_json({"type": "error", "message": str(e)})
        except:
             pass
    finally:
        # Ensure process is killed if we exit for any reason and it's still running
        if process and process.returncode is None:
             try:
                process.terminate()
             except:
                pass
                
        if sandbox_path and os.path.exists(sandbox_path):
             shutil.rmtree(sandbox_path)