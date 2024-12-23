'use client';

import React from 'react';

interface DeleteZoneProps {
  isDragging: boolean;
  onDelete: (taskId: string) => void;
}

const DeleteZone: React.FC<DeleteZoneProps> = ({ isDragging, onDelete }) => {
  // Implement your own logic to detect if a task is over the delete zone
  // For simplicity, this example doesn't handle it

  return (
    <div className={`delete-zone ${isDragging ? 'visible' : ''}`}>
      <div className="delete-zone-content">
        <span className="delete-icon">🗑️</span>
        <span>Drop to Delete</span>
      </div>
      <style jsx>{`
        .delete-zone {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: 200px;
          height: 80px;
          border: 2px dashed #ff4444;
          border-radius: 8px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: white;
          transition: all 0.3s ease;
          z-index: 1000;
          opacity: 0;
          pointer-events: none;
        }

        .delete-zone.visible {
          opacity: 1;
          pointer-events: all;
        }

        .delete-zone.active {
          background: #ffebee;
          border-color: #ff0000;
          border-style: solid;
          transform: translateX(-50%) scale(1.05);
        }

        .delete-zone-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .delete-icon {
          font-size: 24px;
        }

        span {
          font-size: 14px;
          color: #666;
        }
      `}</style>
    </div>
  );
};

export default DeleteZone;
