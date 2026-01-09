import hashlib
import os
import subprocess
import re
from fastapi import FastAPI
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI()

# Configuration
DUMMY_FOLDER = "dummy_files"
BINARY_PATH = "./DingleBob/target/release/dinglebob"

# Ensure the temporary directory exists
os.makedirs(DUMMY_FOLDER, exist_ok=True)

class CodeSubmission(BaseModel):
    code: str

def strip_ansi_codes(text: str) -> str:
    """Removes ANSI escape sequences (colors) from the binary output."""
    ansi_escape = re.compile(r'(?:\x1B[@-_]|[\x80-\x9F])[0-?]*[ -/]*[@-~]')
    return ansi_escape.sub('', text)

@app.get("/")
async def read_root():
    """Serves the frontend editor."""
    return FileResponse("index.html")

@app.post("/submit")
async def submit_code(submission: CodeSubmission):
    # 1. Generate unique hash and temporary path
    code_hash = hashlib.sha256(submission.code.encode('utf-8')).hexdigest()
    filename = f"{code_hash}.dingle"
    file_path = os.path.join(DUMMY_FOLDER, filename)
    
    # 2. Save the code temporarily
    with open(file_path, "w") as f:
        f.write(submission.code)
    
    try:
        # 3. Execute the dinglebob binary
        result = subprocess.run(
            [BINARY_PATH, file_path],
            capture_output=True,
            text=True,
            check=False
        )
        
        # 4. Capture and clean output/errors
        raw_output = result.stdout if result.returncode == 0 else result.stderr
        clean_output = strip_ansi_codes(raw_output)
        
        # Return empty string if there is no output
        if not clean_output.strip():
            clean_output = ""
            
    except Exception as e:
        clean_output = f"Internal Execution Error: {str(e)}"
    
    finally:
        # 5. Cleanup: Delete the file after execution is done
        if os.path.exists(file_path):
            os.remove(file_path)

    return {
        "status": "success", 
        "filename": filename,
        "output": clean_output
    }