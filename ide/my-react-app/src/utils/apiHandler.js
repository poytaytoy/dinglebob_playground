
// Replaces zipHandler.js
// Sends JSON tree directly to backend

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
