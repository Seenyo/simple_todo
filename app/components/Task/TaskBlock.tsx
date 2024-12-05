'use client';

import React from 'react';
import { Task } from '@/types';
import { DraggableCore, DraggableEventHandler } from 'react-draggable';

interface TaskBlockProps {
  task: Task;
  index: number;
  onStatusChange: (id: string, status: Task['status']) => void;
  onDurationChange?: (id: string, newStartTime: string, newEndTime: string) => void;
  onDragStop: (id: string, deltaY: number) => void;
  onDelete: (id: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onEdit: (task: Task) => void;
}

const TaskBlock: React.FC<TaskBlockProps> = ({ task, index, onStatusChange, onDurationChange, onDragStop, onDelete, onDragStart, onDragEnd, onEdit }) => {
  const nodeRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [originalTaskTimes, setOriginalTaskTimes] = React.useState<Map<string, { start: string, end: string }>>(new Map());

  const statusButtons = [
    { status: 'pending' as const, label: 'Pending' },
    { status: 'in-progress' as const, label: 'In Progress' },
    { status: 'complete' as const, label: 'Complete' },
  ];

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const startY = e.clientY;
    const taskElement = nodeRef.current;
    if (!taskElement) return;

    const startHeight = taskElement.clientHeight;
    const timeSlotHeight = 30; // Height of each 15-minute slot

    // Store original times of all tasks
    const taskElements = document.querySelectorAll('.task-block');
    const originalTimes = new Map<string, { start: string, end: string }>();
    taskElements.forEach((element) => {
      const taskId = element.getAttribute('data-task-id');
      if (taskId) {
        const taskData = element.getAttribute('data-task-times');
        if (taskData) {
          const { startTime, endTime } = JSON.parse(taskData);
          originalTimes.set(taskId, { start: startTime, end: endTime });
        }
      }
    });
    setOriginalTaskTimes(originalTimes);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      if (!taskElement) return;

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

        // Only update the resizing task during mouse move
        onDurationChange(task.id, task.startTime, newEndTime);
      }
    };

    const handleMouseUp = () => {
      if (!taskElement || !onDurationChange) return;

      // Get the current times of the resized task
      const resizedTaskData = taskElement.getAttribute('data-task-times');
      if (!resizedTaskData) return;
      
      const { startTime: resizedStartTime, endTime: resizedEndTime } = JSON.parse(resizedTaskData);
      const resizedStart = timeToMinutes(resizedStartTime);
      const resizedEnd = timeToMinutes(resizedEndTime);

      // Check for conflicts after resize is complete
      const taskElements = document.querySelectorAll('.task-block');
      const overlappingTasks: string[] = [];

      // Find all overlapping tasks using time comparison
      taskElements.forEach((element) => {
        const taskId = element.getAttribute('data-task-id');
        const taskData = element.getAttribute('data-task-times');
        if (taskId && taskId !== task.id && taskData) {
          const { startTime, endTime } = JSON.parse(taskData);
          const taskStart = timeToMinutes(startTime);
          const taskEnd = timeToMinutes(endTime);

          // Check if times overlap
          if (resizedEnd > taskStart && resizedStart < taskEnd) {
            overlappingTasks.push(taskId);
          }
        }
      });

      if (overlappingTasks.length > 0) {
        // Sort overlapping tasks by their start time
        overlappingTasks.sort((aId, bId) => {
          const aData = document.querySelector(`[data-task-id="${aId}"]`)?.getAttribute('data-task-times');
          const bData = document.querySelector(`[data-task-id="${bId}"]`)?.getAttribute('data-task-times');
          if (!aData || !bData) return 0;
          
          const { startTime: aStart } = JSON.parse(aData);
          const { startTime: bStart } = JSON.parse(bData);
          return timeToMinutes(aStart) - timeToMinutes(bStart);
        });

        let lastEndTime = resizedEndTime;

        // Adjust overlapping tasks
        overlappingTasks.forEach((id) => {
          const originalTime = originalTaskTimes.get(id);
          if (originalTime) {
            const duration = timeToMinutes(originalTime.end) - timeToMinutes(originalTime.start);
            const newStartTime = lastEndTime;
            const newEndTime = minutesToTime(timeToMinutes(lastEndTime) + duration);

            onDurationChange(id, newStartTime, newEndTime);
            lastEndTime = newEndTime;
          }
        });
      }

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    // Helper functions for time conversion
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const minutesToTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleDrag: DraggableEventHandler = (e, data) => {
    if (nodeRef.current) {
      const el = nodeRef.current;
      const snappedY = Math.round(data.y / 30) * 30;
      el.style.transform = `translateY(${snappedY}px)`;
      el.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.2)';
      el.style.zIndex = '1000';
      el.style.opacity = '0.9';
    }
    setIsDragging(true);
  };

  const handleDragStart: DraggableEventHandler = (e, data) => {
    onDragStart?.();
  };

  const handleDragStop: DraggableEventHandler = (e, data) => {
    if (nodeRef.current) {
      const el = nodeRef.current;
      el.style.boxShadow = '';
      el.style.zIndex = '';
      el.style.transform = '';
      el.style.opacity = '';

      // Check if dropped on delete zone
      const deleteZone = document.querySelector('.delete-zone');
      if (deleteZone) {
        const deleteZoneRect = deleteZone.getBoundingClientRect();
        const mouseEvent = e as unknown as MouseEvent;
        const mouseX = mouseEvent.clientX;
        
        if (mouseX >= deleteZoneRect.left && mouseX <= deleteZoneRect.right) {
          onDelete(task.id);
          onDragEnd?.();
          return;
        }
      }
    }
    
    const snappedDeltaY = Math.round(data.y / 30) * 30;
    onDragStop(task.id, snappedDeltaY);
    onDragEnd?.();
    setIsDragging(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onEdit(task);
  };

  return (
    <DraggableCore 
      onStart={handleDragStart}
      onDrag={handleDrag}
      onStop={handleDragStop}
      nodeRef={nodeRef}
      handle=".drag-handle"
    >
      <div
        ref={nodeRef}
        className={`task-block status-${task.status}`}
        data-task-id={task.id}
        data-task-times={JSON.stringify({ startTime: task.startTime, endTime: task.endTime })}
        style={{ cursor: 'default' }}
        onContextMenu={handleContextMenu}
      >
        <div className="task-content">
          <div className="drag-handle">
            <div className="drag-dots">
              <span />
            </div>
          </div>
          <div className="task-header">
            <div className="title-time">
              <h3>{task.title}</h3>
              <div className="task-time">
                {task.startTime} - {task.endTime}
              </div>
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
            height: 100%;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
            transition: all 0.2s ease;
            cursor: default;
          }

          .task-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
          }

          .drag-handle {
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: -4px 0 4px;
          }

          .drag-dots {
            position: relative;
            height: 100%;
            width: 36px;
            cursor: move;
            padding: 10px 12px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .drag-dots::before,
          .drag-dots::after,
          .drag-dots span {
            content: '';
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background-color: #666;
          }

          .drag-dots span {
            display: inline-block;
          }

          .drag-dots:hover {
            background-color: rgba(0, 0, 0, 0.05);
          }

          .task-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
          }

          .title-time {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
          }

          h3 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            flex-shrink: 1;
            min-width: 0;
          }

          .task-time {
            font-size: 12px;
            color: #666;
            white-space: nowrap;
          }

          .task-details {
            font-size: 12px;
            color: #666;
            margin: 4px 0;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            flex: 1;
          }

          .task-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin: 4px 0;
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
            margin-top: auto;
            padding-top: 8px;
            padding-bottom: 16px;
            border-top: 1px solid #eee;
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
            height: 12px;
            cursor: ns-resize;
            background: transparent;
            transition: background-color 0.2s ease;
          }

          .resize-handle:hover {
            background: rgba(0, 0, 0, 0.05);
          }

          .resize-handle::after {
            content: '';
            position: absolute;
            left: 50%;
            bottom: 4px;
            transform: translateX(-50%);
            width: 30px;
            height: 3px;
            background: #ddd;
            border-radius: 2px;
          }

          .status-pending { border-left: 4px solid #ffd700; }
          .status-in-progress { border-left: 4px solid #1e90ff; }
          .status-complete { border-left: 4px solid #32cd32; }
        `}</style>
      </div>
    </DraggableCore>
  );
};

export default TaskBlock; 