
import { v4 as uuidv4 } from 'uuid';

// Node Types
export const TYPE_FILE = 'file';
export const TYPE_FOLDER = 'folder';

export const createInitialState = () => [
    {
        id: "root-main",
        name: "main.dingle",
        type: TYPE_FILE,
        content: 'print "Hello from DingleBob!";\n'
    }
];

// Helper to find a node by ID (BFS)
export const findNode = (nodes, id) => {
    for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
            const found = findNode(node.children, id);
            if (found) return found;
        }
    }
    return null;
};

// Insert a new node into the tree
// If parentId is null, adds to root
export const insertNode = (nodes, parentId, newNode) => {
    if (!parentId) {
        return [...nodes, newNode];
    }

    return nodes.map(node => {
        if (node.id === parentId) {
            // Return copy of folder with new child
            return {
                ...node,
                children: [...(node.children || []), newNode]
            };
        } else if (node.children) {
            // Recurse
            return {
                ...node,
                children: insertNode(node.children, parentId, newNode)
            };
        }
        return node;
    });
};

// Delete a node by ID
export const deleteNode = (nodes, id) => {
    return nodes.filter(node => {
        if (node.id === id) return false; // Remove this node
        if (node.children) {
            node.children = deleteNode(node.children, id); // Recurse
        }
        return true; // Keep this node
    });
};

// Rename a node by ID
export const renameNode = (nodes, id, newName) => {
    return nodes.map(node => {
        if (node.id === id) {
            return { ...node, name: newName };
        }
        if (node.children) {
            return { ...node, children: renameNode(node.children, id, newName) };
        }
        return node;
    });
};

// Update file content
export const updateFileContent = (nodes, id, newContent) => {
    return nodes.map(node => {
        if (node.id === id) {
            return { ...node, content: newContent };
        }
        if (node.children) {
            return { ...node, children: updateFileContent(node.children, id, newContent) };
        }
        return node;
    });
};

// Flatten tree to paths for Zip export: { "src/main.dingle": "content" }
export const flattenTree = (nodes, prefix = "") => {
    let result = {};

    nodes.forEach(node => {
        const path = prefix + node.name;

        if (node.type === TYPE_FILE) {
            result[path] = node.content || "";
        } else if (node.type === TYPE_FOLDER) {
            // Empty folder? We might need to handle it if zip supports it, 
            // but usually we just process children.
            // If we want empty dir support, we might add a key ending in /.
            // For now, let's just recurse.
            const childrenFlat = flattenTree(node.children || [], path + "/");
            result = { ...result, ...childrenFlat };

            // If folder is empty, maybe add explicit dir key?
            if (!node.children || node.children.length === 0) {
                result[path + "/"] = "";
            }
        }
    });

    return result;
};
