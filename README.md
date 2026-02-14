# DingleBob Playground

An interactive web-based IDE for the **DingleBob** programming language. Write code, manage files, and execute DingleBob programs directly in your browser.

## Features

*   **Web IDE**: Code editor with basic syntax highlighting.
*   **Virtual File System**: Create files, folders, rename, and delete nodes.
*   **Real-time Execution**: Runs DingleBob code on the backend and streams output via WebSocket.
*   **Sample Projects**: Load example DingleBob code (Algorithms, File I/O, etc.).
*   **Export/Import**: Download your project as a JSON config or ZIP file.

## Project Structure

*   `ide/`: React frontend (Vite).
*   `backend/`: Python FastAPI backend.
    *   `DingleBob/`: The DingleBob language interpreter (Rust).
*   `Dockerfile`: Multi-stage build for deployment.

## Running with Docker (Recommended)

This is the easiest way to run the playground, as it handles all dependencies (Node, Rust, Python) automatically.

### 1. Build the Image

```bash
docker build -t dinglebob-playground .
```

### 2. Run the Container

```bash
docker run -p 8000:8000 dinglebob-playground
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

## Deployment (Render)

This project is configured for seamless deployment on [Render](https://render.com).

1.  Connect your GitHub repository to Render.
2.  Select **"Web Service"**.
3.  Choose **Docker** as the Runtime.
4.  Render will automatically build the `Dockerfile` and deploy.
5.  The app listens on port `8000` (or the `$PORT` variable provided by Render).

## Local Development

If you want to contribute or run components individually:

### Prerequisites

*   Node.js (v18+)
*   Python (v3.10+)
*   Rust (latest stable)

### 1. Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

You also need the DingleBob binary. The Dockerfile handles this automatically, but locally you must build it:

```bash
# Clone DingleBob if not present (or as submodule)
git clone https://github.com/poytaytoy/DingleBob.git backend/DingleBob

# Build it
cd backend/DingleBob
cargo build --release
```

Run the server:

```bash
# From the root directory or backend directory
uvicorn app:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd ide
npm install
npm run dev
```

The frontend will start on [http://localhost:5173](http://localhost:5173). It is configured to proxy requests to the backend at port 8000.
