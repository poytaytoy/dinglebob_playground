import React from 'react';

const Editor = ({ value, onChange, placeholder }) => {
    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const val = e.target.value;
            e.target.value = val.substring(0, start) + "    " + val.substring(end);
            e.target.selectionStart = e.target.selectionEnd = start + 4;
            onChange(e.target.value);
        }
    };

    return (
        <textarea
            style={{
                width: '100%',
                height: '100%',
                fontFamily: 'monospace',
                fontSize: '13px',
                border: 'none',
                outline: 'none',
                resize: 'none',
                padding: '10px',
                backgroundColor: '#fff',
                lineHeight: '1.5'
            }}
            value={value}
            onChange={(e) => onChange(e.target.value)} // Propagate change up
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            spellCheck="false"
        />
    );
};

export default Editor;
