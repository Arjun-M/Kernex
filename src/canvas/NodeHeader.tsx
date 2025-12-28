import React from 'react';

interface NodeHeaderProps {
  title: string;
  onClose: () => void;
  headerRef: React.RefObject<HTMLDivElement | null>;
}

const NodeHeader: React.FC<NodeHeaderProps> = ({ title, onClose, headerRef }) => {
  return (
    <div ref={headerRef} className="node-header">
      <span className="node-header-title">{title}</span>
      <button className="node-header-close" onClick={onClose} aria-label="Close node">
        &times;
      </button>
    </div>
  );
};

export default NodeHeader;
