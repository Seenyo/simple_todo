'use client';

import React from 'react';
import { Task } from '@/types';
import TaskBlock from '@/components/Task/TaskBlock';
import { Droppable } from 'react-beautiful-dnd';

interface TimelineGridProps {
  tasks: Task[];
  onTaskStatusChange: (taskId: string, status: Task['status']) => void;
  onTaskMove: (taskId: string, newStartTime: string) => void;
  onTaskDurationChange: (taskId: string, newStartTime: string, newEndTime: string) => void;
  onTaskDelete: (taskId: string) => void;
}

const TimelineGrid: React.FC<TimelineGridProps> = ({
  tasks,
  onTaskStatusChange,
  onTaskMove,
  onTaskDurationChange,
  onTaskDelete,
}) => {
  // Generate time slots from 8 AM to 8 PM in 15-minute intervals
  const timeSlots = Array.from({ length: 49 }, (_, index) => {
    const hour = Math.floor(index / 4) + 8;
    const minute = (index % 4) * 15;
    const formattedHour = hour.toString().padStart(2, '0');
    const formattedMinute = minute.toString().padStart(2, '0');
    return {
      time: `${formattedHour}:${formattedMinute}`,
      label: `${hour % 12 || 12}:${formattedMinute} ${hour < 12 ? 'AM' : 'PM'}`
    };
  });

  const getMinutesFromTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours * 60) + minutes;
  };

  const getTimeFromMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const getTaskPosition = (task: Task) => {
    const startTime = getMinutesFromTime(task.startTime);
    const endTime = getMinutesFromTime(task.endTime);
    const gridStart = 8 * 60; // 8:00 AM in minutes

    // Calculate position relative to 8:00 AM
    const topPosition = ((startTime - gridStart) / 15) * 30; // Each 15-min slot is 30px high
    const duration = endTime - startTime;
    const height = (duration / 15) * 30;

    return {
      top: `${topPosition}px`,
      height: `${height}px`,
    };
  };

  return (
    <div className="timeline-container">
      <div className="timeline-grid">
        {/* Time slots */}
        <div className="time-slots">
          {timeSlots.map(({ time, label }) => (
            <div key={time} className="time-slot" data-time={time}>
              <span className="time-label">{label}</span>
              <div className="grid-line" />
            </div>
          ))}
        </div>

        {/* Droppable area */}
        <Droppable
          droppableId="timeline"
          type="TASK"
          direction="vertical"
          isDropDisabled={false}
          isCombineEnabled={false}
          ignoreContainerClipping={false}
        >
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`tasks-overlay ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
              data-testid="timeline-droppable"
            >
              {tasks.map((task, index) => (
                <div
                  key={task.id}
                  className="task-wrapper"
                  style={getTaskPosition(task)}
                  data-task-id={task.id}
                >
                  <TaskBlock
                    task={task}
                    index={index}
                    onStatusChange={onTaskStatusChange}
                    onDurationChange={onTaskDurationChange}
                  />
                </div>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>

      <style jsx>{`
        .timeline-container {
          position: relative;
          margin-left: 120px;
          border: 1px solid #eee;
          border-radius: 8px;
          background: white;
          overflow: hidden;
        }

        .timeline-grid {
          position: relative;
          padding: 20px;
          min-height: ${48 * 30}px; /* 48 15-minute intervals * 30px height */
        }

        .time-slots {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }

        .time-slot {
          position: relative;
          height: 30px;
          border-bottom: 1px solid #f0f0f0;
        }

        .time-slot:last-child {
          border-bottom: none;
        }

        .time-label {
          position: absolute;
          left: -120px;
          top: 50%;
          transform: translateY(-50%);
          width: 110px;
          font-size: 12px;
          color: #666;
          text-align: right;
          padding-right: 10px;
          white-space: nowrap;
        }

        .grid-line {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 1px;
          background-color: #f0f0f0;
        }

        .tasks-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 20px;
          min-height: 100%;
          cursor: pointer;
        }

        .tasks-overlay.dragging-over {
          background: rgba(0, 123, 255, 0.02);
        }

        .task-wrapper {
          position: absolute;
          left: 20px;
          right: 20px;
          pointer-events: all;
          transition: top 0.1s ease;
        }
      `}</style>
    </div>
  );
};

export default TimelineGrid; 