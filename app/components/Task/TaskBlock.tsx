'use client';

import React from 'react';
import { Task } from '@/types';
import { Draggable } from 'react-beautiful-dnd';

interface TaskBlockProps {
  task: Task;
  index: number;
  onStatusChange: (id: string, status: Task['status']) => void;
  onDurationChange?: (id: string, newStartTime: string, newEndTime: string) => void;
}

const TaskBlock: React.FC<TaskBlockProps> = ({ task, index, onStatusChange, onDurationChange }) => {
  const statusButtons = [
    { status: 'pending' as const, label: 'Pending' },
    { status: 'in-progress' as const, label: 'In Progress' },
    { status: 'complete' as const, label: 'Complete' },
  ];

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const startY = e.clientY;
    const startHeight = e.currentTarget.parentElement?.clientHeight || 0;
    const timeSlotHeight = 30; // Height of each 15-minute slot

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(timeSlotHeight, startHeight + deltaY);
      const newDurationSlots = Math.round(newHeight / timeSlotHeight);
      
      if (onDurationChange && task.startTime) {
        const [startHour, startMinute] = task.startTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMinute;
        const newEndMinutes = startMinutes + (newDurationSlots * 15);
        const newEndHour = Math.floor(newEndMinutes / 60);
        const newEndMinute = newEndMinutes % 60;
        const newEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMinute.toString().padStart(2, '0')}`;
        
        onDurationChange(task.id, task.startTime, newEndTime);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          data-task-id={task.id}
          className={`task-block status-${task.status} ${snapshot.isDragging ? 'dragging' : ''}`}
        >
          <div {...provided.dragHandleProps} className="drag-handle">
            <div className="task-content">
              <div className="task-header">
                <h3>{task.title}</h3>
                <div className="task-time">
                  {task.startTime} - {task.endTime}
                </div>
              </div>
              {task.details && <p className="task-details">{task.details}</p>}
              <div className="task-tags">
                {task.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="status-buttons">
              {statusButtons.map(({ status, label }) => (
                <button
                  key={status}
                  className={`status-button ${task.status === status ? 'active' : ''}`}
                  onClick={() => onStatusChange(task.id, status)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="resize-handle" onMouseDown={handleResizeStart} />

          <style jsx>{`
            .task-block {
              border: 1px solid #ddd;
              border-radius: 4px;
              padding: 8px;
              background: white;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
              height: calc(100% - 16px);
              overflow: hidden;
              display: flex;
              flex-direction: column;
              position: relative;
              transition: box-shadow 0.2s ease;
              cursor: move;
            }

            .task-block.dragging {
              box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
              opacity: 0.9;
              transform: scale(1.02);
            }

            .drag-handle {
              flex: 1;
              cursor: move;
            }

            .status-pending { border-left: 4px solid #ffd700; }
            .status-in-progress { border-left: 4px solid #1e90ff; }
            .status-complete { border-left: 4px solid #32cd32; }

            .task-content {
              flex: 1;
              min-height: 0;
              overflow: hidden;
            }

            .task-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 4px;
            }

            .task-time {
              font-size: 12px;
              color: #666;
              white-space: nowrap;
              margin-left: 8px;
            }

            h3 {
              margin: 0;
              font-size: 14px;
              font-weight: 600;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              flex: 1;
            }

            .task-details {
              font-size: 12px;
              color: #666;
              margin: 4px 0;
              overflow: hidden;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
            }

            .task-tags {
              display: flex;
              flex-wrap: wrap;
              gap: 4px;
              margin-top: 4px;
            }

            .tag {
              background: #f0f0f0;
              padding: 2px 6px;
              border-radius: 12px;
              font-size: 11px;
              white-space: nowrap;
            }

            .status-buttons {
              display: flex;
              gap: 4px;
              margin-top: 8px;
              flex-shrink: 0;
            }

            .status-button {
              padding: 2px 6px;
              border: 1px solid #ddd;
              border-radius: 4px;
              background: white;
              cursor: pointer;
              font-size: 11px;
              flex: 1;
              white-space: nowrap;
              transition: all 0.2s ease;
            }

            .status-button:hover {
              background: #f8f9fa;
            }

            .status-button.active {
              background: #007bff;
              color: white;
              border-color: #0056b3;
            }

            .resize-handle {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 6px;
              cursor: ns-resize;
              background: transparent;
            }

            .resize-handle:hover {
              background: rgba(0, 0, 0, 0.05);
            }

            .resize-handle::after {
              content: '';
              position: absolute;
              left: 50%;
              bottom: 2px;
              transform: translateX(-50%);
              width: 20px;
              height: 2px;
              background: #ddd;
              border-radius: 1px;
            }
          `}</style>
        </div>
      )}
    </Draggable>
  );
};

export default TaskBlock; 