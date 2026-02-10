import React, { useRef } from 'react';

const Editor = ({ value, onChange, placeholder }) => {
    const textareaRef = useRef(null);
    const linesRef = useRef(null);

    const handleScroll = () => {
        if (textareaRef.current && linesRef.current) {
            linesRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    };

    const handleKeyDown = (e) => {
        const textarea = e.target;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const val = textarea.value;

        // Auto-pairing
        const pairs = { '{': '}', '(': ')', '[': ']', '"': '"', "'": "'" };
        if (pairs[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            const pair = pairs[e.key];
            const newValue = val.substring(0, start) + e.key + pair + val.substring(end);

            // Fix: Call onChange with the string value directly
            onChange(newValue);

            // Move cursor inside pair after render
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 1;
            }, 0);
            return;
        }

        // Skip closing pair
        if (['}', ')', ']', '"', "'"].includes(e.key)) {
            if (val[start] === e.key) {
                e.preventDefault();
                textarea.selectionStart = textarea.selectionEnd = start + 1;
                return;
            }
        }

        // Tab indentation
        if (e.key === 'Tab') {
            e.preventDefault();
            const newValue = val.substring(0, start) + "    " + val.substring(end);
            onChange(newValue);
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 4;
            }, 0);
            return;
        }

        // Auto-indent on Enter
        if (e.key === 'Enter') {
            e.preventDefault();
            const before = val.lastIndexOf('\n', start - 1) + 1;
            const prevLine = val.slice(before, start);
            let indent = (prevLine.match(/^\s*/) || [''])[0];

            // Increase indent if previous line ended with {
            if (prevLine.trim().endsWith('{')) {
                indent += "    ";
            }

            const newValue = val.substring(0, start) + '\n' + indent + val.substring(end);
            onChange(newValue);

            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length;
            }, 0);
            return;
        }
    };

    const lineCount = value.split('\n').length;
    const lines = Array.from({ length: lineCount }, (_, i) => i + 1);

    return (
        <div style={{ display: 'flex', height: '100%', boxSizing: 'border-box', border: '1px solid #ccc', overflow: 'hidden' }}>
            {/* Line Numbers */}
            <div
                ref={linesRef}
                style={{
                    width: '40px',
                    backgroundColor: '#f0f0f0',
                    textAlign: 'right',
                    padding: '10px 5px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    color: '#888',
                    overflow: 'hidden',
                    userSelect: 'none',
                    borderRight: '1px solid #ddd',
                    boxSizing: 'border-box' // Important for padding
                }}
            >
                {lines.map(n => <div key={n}>{n}</div>)}
            </div>

            {/* Editor */}
            <textarea
                ref={textareaRef}
                style={{
                    flex: 1,
                    height: '100%',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    padding: '10px',
                    backgroundColor: '#fff',
                    lineHeight: '1.5',
                    overflow: 'auto',
                    whiteSpace: 'pre',
                    boxSizing: 'border-box' // Important for padding
                }}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                placeholder={placeholder}
                spellCheck="false"
                autoCapitalize='off'
                autoComplete='off'
                autoCorrect='off'
            />
        </div>
    );
};

export default Editor;
