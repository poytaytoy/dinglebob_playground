# Stage 1: Build Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/ide
COPY ide/package*.json ./
RUN npm ci
COPY ide/ .
RUN npm run build

# Stage 2: Build Rust Binary
FROM rust:latest AS rust-builder
WORKDIR /app/backend/DingleBob

# Install git and build dependencies
RUN apt-get update && apt-get install -y git build-essential

# Clone the repository
RUN git clone https://github.com/poytaytoy/DingleBob.git .

# Build the binary
RUN cargo build --release

# Stage 3: Runtime
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend code
COPY backend/ /app/backend/

# Copy compiled artifacts
COPY --from=frontend-builder /app/ide/dist /app/backend/static
COPY --from=rust-builder /app/backend/DingleBob/target/release/dinglebob /app/backend/DingleBob/target/release/dinglebob

# Install Python dependencies
WORKDIR /app/backend
RUN pip install --no-cache-dir -r requirements.txt

# Create execution directory
RUN mkdir -p exec

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
