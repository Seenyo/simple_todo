'use client';

import React from 'react';
import { Task } from '@/types';
import TaskBlock from '@/components/Task/TaskBlock';

interface TimelineGridProps {
  tasks: Task[];
  onTaskStatusChange: (taskId: string, status: Task['status']) => void;
  onTaskMove: (taskId: string, newStartTime: string) => void;
  onTaskDurationChange: (taskId: string, newStartTime: string, newEndTime: string) => void;
  onTaskDelete: (taskId: string) => void;
  onDateChange: (date: Date) => void;
  onEdit: (task: Task) => void;
}

const TimelineGrid: React.FC<TimelineGridProps> = ({
  tasks,
  onTaskStatusChange,
  onTaskMove,
  onTaskDurationChange,
  onTaskDelete,
  onDateChange,
  onEdit
}) => {
  const [scale, setScale] = React.useState(30); // pixels per 15 minutes
  const [scrollPosition, setScrollPosition] = React.useState(0);
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [isDraggingTask, setIsDraggingTask] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Update current time every minute
  React.useEffect(() => {
    const updateCurrentTime = () => {
      setCurrentTime(new Date());
    };

    const timer = setInterval(updateCurrentTime, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // Calculate current time position
  const getCurrentTimePosition = () => {
    const now = currentTime;
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const gridStart = 8 * 60; // 8:00 AM in minutes
    const position = ((totalMinutes - gridStart) / 15) * scale;
    return position;
  };

  // Auto scroll to current time on mount and date change
  React.useEffect(() => {
    const position = getCurrentTimePosition();
    if (position > 0 && position < 65 * scale) {
      const scrollTo = Math.max(0, position - (containerRef.current?.clientHeight || 0) / 2);
      containerRef.current?.scrollTo({ top: scrollTo, behavior: 'smooth' });
    }
  }, [selectedDate, scale]);

  const handleDateChange = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
    onDateChange(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setScrollPosition(0);
    onDateChange(today);
  };

  // Generate time slots from 8 AM to 24:00 (midnight) in 15-minute intervals
  const timeSlots = Array.from({ length: 65 }, (_, index) => { // 65 slots for 16 hours (8AM-24:00)
    const hour = Math.floor(index / 4) + 8;
    const minute = (index % 4) * 15;
    const formattedHour = hour.toString().padStart(2, '0');
    const formattedMinute = minute.toString().padStart(2, '0');
    return {
      time: `${formattedHour}:${formattedMinute}`,
      label: `${hour % 12 || 12}:${formattedMinute} ${hour < 12 ? 'AM' : 'PM'}`
    };
  });

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      e.preventDefault();
      const delta = -e.deltaY;
      setScale(prev => Math.min(Math.max(15, prev + delta * 0.1), 60));
    } else if (e.shiftKey) {
      // Horizontal scroll
      e.preventDefault();
      setScrollPosition(prev => Math.min(Math.max(0, prev + e.deltaY), 1440 * scale - (containerRef.current?.clientWidth || 0)));
    }
  };

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
    const slotHeight = scale;
    const slotsFromStart = (startTime - gridStart) / 15;
    const topPosition = slotsFromStart * slotHeight;
    const durationSlots = (endTime - startTime) / 15;
    const height = durationSlots * slotHeight;

    return {
      top: `${Math.round(topPosition)}px`,
      height: `${Math.round(height)}px`,
    };
  };

  // Handle drag stop event from TaskBlock
  const handleDragStop = (taskId: string, deltaY: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Calculate new times based on snapped deltaY
    const slotsMoved = deltaY / 30;
    const minutesMoved = slotsMoved * 15;

    const startMinutes = getMinutesFromTime(task.startTime);
    const duration = getMinutesFromTime(task.endTime) - startMinutes;
    const newStartMinutes = startMinutes + minutesMoved;

    // Validate time range (8:00 - 24:00)
    if (newStartMinutes < 8 * 60 || newStartMinutes + duration > 24 * 60) {
      return; // Do not allow moving outside the timeline
    }

    const newStartTime = getTimeFromMinutes(Math.round(newStartMinutes));
    const newEndTime = getTimeFromMinutes(Math.round(newStartMinutes + duration));

    // Find overlapping tasks
    const overlappingTasks = tasks.filter(t => 
      t.id !== taskId && 
      getMinutesFromTime(t.startTime) < newStartMinutes + duration &&
      getMinutesFromTime(t.endTime) > newStartMinutes
    );

    if (overlappingTasks.length > 0) {
      // Sort tasks by start time
      overlappingTasks.sort((a, b) => 
        getMinutesFromTime(a.startTime) - getMinutesFromTime(b.startTime)
      );

      // Move overlapping tasks
      overlappingTasks.forEach(t => {
        const tStartMinutes = getMinutesFromTime(t.startTime);
        const tDuration = getMinutesFromTime(t.endTime) - tStartMinutes;
        const newTStartTime = getTimeFromMinutes(Math.round(newStartMinutes + duration));
        const newTEndTime = getTimeFromMinutes(Math.round(newStartMinutes + duration + tDuration));
        
        if (newTStartTime && newTEndTime) {
          onTaskMove(t.id, newTStartTime);
          onTaskDurationChange(t.id, newTStartTime, newTEndTime);
        }
      });
    }

    // Update the dragged task
    onTaskMove(taskId, newStartTime);
    onTaskDurationChange(taskId, newStartTime, newEndTime);
  };

  const handleDragStart = () => {
    setIsDraggingTask(true);
  };

  const handleDragEnd = () => {
    setIsDraggingTask(false);
  };

  return (
    <div className="timeline-container" ref={containerRef}>
      <div className="timeline-controls">
        <button onClick={goToToday}>Today</button>
        <button onClick={() => handleDateChange(-1)}>Previous Day</button>
        <button onClick={() => handleDateChange(1)}>Next Day</button>
        <span className="date-display">
          {selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </span>
        <div className="zoom-controls">
          <button onClick={() => setScale(prev => Math.max(15, prev - 5))}>-</button>
          <span>Zoom: {Math.round((scale / 30) * 100)}%</span>
          <button onClick={() => setScale(prev => Math.min(60, prev + 5))}>+</button>
        </div>
      </div>

      <div className="timeline-grid">
        <div className="time-slots">
          {timeSlots.map(({ time, label }, index) => (
            <div 
              key={time} 
              className="time-slot"
            >
              <span className="time-label">{label}</span>
            </div>
          ))}
        </div>

        <div 
          className="grid-content" 
          onWheel={handleWheel}
        >
          <div className="grid-lines">
            {timeSlots.map(({ time }, index) => (
              <div 
                key={time} 
                className="grid-line"
                style={{ top: 0, height: `${(index + 1) * scale}px` }}
              />
            ))}
          </div>

          {/* Current time indicator */}
          {getCurrentTimePosition() > 0 && getCurrentTimePosition() < 65 * scale && (
            <div 
              className="current-time-indicator"
              style={{ 
                top: `${getCurrentTimePosition()}px`
              }}
            >
              <div className="time-marker" />
              <span className="current-time">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          <div className="tasks-overlay">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className="task-wrapper"
                style={getTaskPosition(task)}
              >
                <TaskBlock
                  task={task}
                  index={index}
                  onStatusChange={onTaskStatusChange}
                  onDurationChange={onTaskDurationChange}
                  onDragStop={handleDragStop}
                  onDelete={onTaskDelete}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onEdit={onEdit}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Delete Zone - only shown when dragging */}
        <div className={`delete-zone ${isDraggingTask ? 'visible' : ''}`}>
          <div className="delete-zone-content">
            <span>Drop here to delete</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .timeline-container {
          display: flex;
          flex-direction: column;
          width: 100%;
          background: white;
          border-radius: 8px;
          overflow: hidden;
        }

        .timeline-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: white;
          border-bottom: 1px solid #eee;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .timeline-grid {
          display: flex;
          position: relative;
          height: ${65 * scale}px;
        }

        .time-slots {
          width: 100px;
          flex-shrink: 0;
          position: sticky;
          left: 0;
          background: white;
          z-index: 2;
          border-right: 1px solid #eee;
        }

        .time-slot {
          position: relative;
          height: ${scale}px;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 10px;
          box-sizing: border-box;
        }

        .time-label {
          font-size: 12px;
          color: #666;
          white-space: nowrap;
          line-height: 1;
          transform: translateY(-1px);
        }

        .grid-content {
          flex-grow: 1;
          position: relative;
          overflow-x: auto;
        }

        .grid-lines {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: ${65 * scale}px; /* Adjusted for 65 slots */
          pointer-events: none;
        }

        .grid-line {
          position: absolute;
          left: 0;
          right: 0;
          border-bottom: 1px solid #f0f0f0;
          height: ${scale}px;
          box-sizing: border-box;
        }

        .tasks-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: ${65 * scale}px; /* Adjusted for 65 slots */
          pointer-events: all;
        }

        .task-wrapper {
          position: absolute;
          left: 20px;
          right: 20px;
          pointer-events: all;
          transition: top 0.2s ease, height 0.2s ease;
        }

        .zoom-controls {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .timeline-controls button {
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .timeline-controls button:hover {
          background: #f8f9fa;
          border-color: #ccc;
        }

        .date-display {
          margin: 0 12px;
          font-weight: 500;
          color: #333;
        }

        .time-slot.past,
        .grid-line.past {
          background-color: rgba(0, 0, 0, 0.02);
        }

        .current-time-indicator {
          position: absolute;
          left: 0;
          right: 0;
          height: 0;
          z-index: 3;
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .time-marker {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: #ff3b30;
          box-shadow: 0 0 4px rgba(255, 59, 48, 0.4);
        }

        .time-marker::before {
          content: '';
          position: absolute;
          left: -4px;
          top: -3px;
          width: 8px;
          height: 8px;
          background: #ff3b30;
          border-radius: 50%;
        }

        .current-time {
          position: absolute;
          right: 8px;
          background: #ff3b30;
          color: white;
          padding: 2px 4px;
          border-radius: 3px;
          font-size: 11px;
          transform: translateY(-50%);
        }

        .delete-zone {
          width: 0;
          flex-shrink: 0;
          position: sticky;
          right: 0;
          background: rgba(255, 59, 48, 0.1);
          border-left: 2px dashed #ff3b30;
          display: flex;
          align-items: center;
          justify-content: center;
          writing-mode: vertical-lr;
          transform: rotate(180deg);
          transition: all 0.2s ease;
          opacity: 0;
          pointer-events: none;
        }

        .delete-zone.visible {
          width: 100px;
          opacity: 1;
          pointer-events: all;
        }

        .delete-zone:hover {
          background: rgba(255, 59, 48, 0.2);
        }

        .delete-zone-content {
          color: #ff3b30;
          font-size: 14px;
          font-weight: 500;
          padding: 20px 0;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
};

export default TimelineGrid;
