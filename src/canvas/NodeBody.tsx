import React from 'react';

interface NodeBodyProps {
  type: string;
  iframeSrc: string | null;
  content: React.ReactNode | null;
  width: number;
  height: number;
}

const NodeBody: React.FC<NodeBodyProps> = ({ type, iframeSrc, content, width, height }) => {
  if (type === 'iframe' && iframeSrc) {
    return (
      <div className="node-body" style={{ width: `${width}px`, height: `${height}px`, overflow: 'hidden' }}>
        <iframe
          src={iframeSrc}
          width="100%"
          height="100%"
          style={{ border: 'none', pointerEvents: 'auto' }}
          frameBorder="0"
          title="Node Iframe"
        ></iframe>
      </div>
    );
  } 
  
  return (
    <div className="node-body" style={{ width: `${width}px`, height: `${height}px`, padding: '10px', overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>
       {content || (
         <>
            <p>Node Content Area</p>
            <p>Type: {type}</p>
         </>
       )}
    </div>
  );
};

export default NodeBody;
