
import React, { useState } from 'react';
import { TYPE_FOLDER } from '../utils/fileSystem';

const FileTreeNode = ({ node, activeFileId, selectedId, onSelect, onDelete, onRename, depth }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isHovered, setIsHovered] = useState(false);

    const isDir = node.type === TYPE_FOLDER;
    const isSelected = node.id === selectedId;
    const isActive = node.id === activeFileId;

    // Protect main.dingle at root
    const isProtected = node.name === "main.dingle" && depth === 0;

    const handleClick = (e) => {
        e.stopPropagation();
        onSelect(node.id);
        if (isDir) setIsExpanded(!isExpanded);
    };

    const style = {
        paddingLeft: `${depth * 20 + 5}px`,
        paddingRight: '5px',
        cursor: 'pointer',
        backgroundColor: isSelected ? '#e0e0e0' : (isHovered ? '#f0f0f0' : 'transparent'),
        fontWeight: isActive ? 'bold' : 'normal',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#000',
        borderBottom: '1px solid #f0f0f0',
        height: '24px',
        borderLeft: depth > 0 ? '1px solid #eee' : 'none'
    };

    return (
        <div>
            <div
                style={style}
                onClick={handleClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '5px', width: '15px', display: 'inline-block', textAlign: 'center' }}>
                        {isDir ? (isExpanded ? '📂' : '📁') : '📄'}
                    </span>
                    {node.name}
                </div>

                {!isProtected && (
                    <div className="actions" style={{ display: 'flex', gap: '5px' }}>
                        <span
                            onClick={(e) => { e.stopPropagation(); onRename(node.id); }}
                            title="Rename"
                            style={{ cursor: 'pointer' }}
                        >
                            ✏️
                        </span>
                        <span
                            onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
                            title="Delete"
                            style={{ cursor: 'pointer', color: 'red' }}
                        >
                            ✕
                        </span>
                    </div>
                )}
            </div>

            {isDir && isExpanded && node.children && (
                <div>
                    {node.children.map(child => (
                        <FileTreeNode
                            key={child.id}
                            node={child}
                            activeFileId={activeFileId}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            onDelete={onDelete}
                            onRename={onRename}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const FileTree = ({ nodes, activeFileId, selectedId, onSelect, onDelete, onRename }) => {
    return (
        <div
            style={{ height: '100%', overflowY: 'auto', minHeight: '100%' }}
            onClick={() => onSelect(null)}
        >
            {nodes.map(node => (
                <FileTreeNode
                    key={node.id}
                    node={node}
                    activeFileId={activeFileId}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    onDelete={onDelete}
                    onRename={onRename}
                    depth={0}
                />
            ))}
        </div>
    );
};

export default FileTree;
