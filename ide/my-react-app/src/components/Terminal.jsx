import React from 'react';

const Terminal = ({ output }) => {
    return (
        <div style={{
            backgroundColor: '#fff',
            color: '#000',
            fontFamily: 'monospace',
            padding: '10px',
            overflow: 'auto',
            height: '100%',
            whiteSpace: 'pre-wrap',
            fontSize: '13px'
        }}>
            {output || <span style={{ color: '#888' }}># Output will appear here...</span>}
        </div>
    );
};

export default Terminal;
