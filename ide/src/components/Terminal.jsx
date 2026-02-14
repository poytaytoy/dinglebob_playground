import React, { useEffect, useRef } from 'react';

const Terminal = ({ output }) => {
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [output]);

    return (
        <div style={{
            backgroundColor: '#fff',
            color: '#000',
            fontFamily: 'monospace',
            padding: '10px',
            overflowY: 'auto',
            maxHeight: '200px', // Limit height
            height: '100%',
            whiteSpace: 'pre-wrap',
            fontSize: '13px'
        }}>
            {output || <span style={{ color: '#888' }}># Output will appear here...</span>}
            <div ref={endRef} />
        </div>
    );
};

export default Terminal;
