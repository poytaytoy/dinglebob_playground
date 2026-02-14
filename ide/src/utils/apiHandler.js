
// Replaces zipHandler.js
// Sends JSON tree directly to backend via WebSocket for streaming output

export const streamCode = (fileTree, onOutput, onComplete, onError) => {
    const ws = new WebSocket('ws://localhost:8000/ws/submit');

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
        const response = await fetch('http://localhost:8000/submit', {
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
