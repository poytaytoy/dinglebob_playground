import hashlib
import os
import subprocess
import shutil
import uuid
from typing import List, Optional, Literal
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    # We strip the base_path to get relative structure, 
    # but here we just list dir content
    
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
        # We assume main.dingle is at root, but user can put it anywhere?
        # Standard: run 'main.dingle' in root.
        main_path = os.path.join(sandbox_path, "main.dingle")
        
        if not os.path.exists(main_path):
            output = "Error: main.dingle not found in root."
        else:
            # 4. Execute
            # Run specific main.dingle
            result = subprocess.run(
                [os.path.abspath(BINARY_PATH), "main.dingle"],
                cwd=os.path.abspath(sandbox_path), # Set CWD to sandbox root
                capture_output=True,
                text=True
            )
            
            raw = result.stdout if result.returncode == 0 else result.stderr
            output = clean_output(raw)
            
        # 5. Read back new state
        # We re-scan the whole folder to catch new files/folders
        new_tree = scan_fs_to_tree(sandbox_path)
        
    except Exception as e:
        # Cleanup if needed
        if os.path.exists(sandbox_path):
             shutil.rmtree(sandbox_path)
        raise HTTPException(status_code=500, detail=f"Internal Execution Error: {str(e)}")
        
    finally:
        # 6. Cleanup
        if os.path.exists(sandbox_path):
             shutil.rmtree(sandbox_path)
             
    return ExecutionResponse(output=output, files=new_tree)