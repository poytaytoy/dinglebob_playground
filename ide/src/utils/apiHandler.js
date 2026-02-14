
// Replaces zipHandler.js
// Sends JSON tree directly to backend via WebSocket for streaming output

export const streamCode = (fileTree, onOutput, onComplete, onError) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // includes port
    // In dev, we might be on port 5173 but backend is 8000. 
    // In prod, safe to use window.location.host if served from same origin.
    // Fallback for dev: if port is 5173, assume backend is 8000.
    const wsHost = host.includes('5173') ? host.replace('5173', '8000') : host;
    const ws = new WebSocket(`${protocol}//${wsHost}/ws/submit`);

    ws.onopen = () => {
        // Send the initial file tree payload
        ws.send(JSON.stringify({ files: fileTree }));
    };

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);

            if (msg.type === 'stdout' || msg.type === 'stderr') {
                if (onOutput) onOutput(msg.data);
            } else if (msg.type === 'result') {
                if (onComplete) onComplete(msg.files);
                ws.close();
            } else if (msg.type === 'error') {
                if (onError) onError(msg.message);
                ws.close();
            }
        } catch (e) {
            console.error("Failed to parse WS message", e);
        }
    };

    ws.onerror = (error) => {
        if (onError) onError("WebSocket Error");
    };

    ws.onclose = () => {
        // Connection closed
    };

    return ws; // Return ws instance in case caller wants to force close
};

// Deprecated: kept for reference or fallback if needed
export const submitCode = async (fileTree) => {
    try {
        // Use relative path for production, handle dev proxy if needed
        const baseUrl = window.location.port === '5173' ? 'http://localhost:8000' : '';
        const response = await fetch(`${baseUrl}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ files: fileTree })
        });

        if (!response.ok) {
            throw new Error(`Server Error: ${response.statusText}`);
        }

        const result = await response.json();
        // Result shape: { output: string, files: FileNode[] }
        return {
            output: result.output,
            newTree: result.files
        };

    } catch (e) {
        throw e;
    }
};
