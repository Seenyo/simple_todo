'use client';

import React, { useState, useRef } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import LoginForm from '@/components/Auth/LoginForm';
import TimelineGrid from '@/components/Timeline/TimelineGrid';
import TaskForm from '@/components/Task/TaskForm';
import DeleteZone from '@/components/Task/DeleteZone';
import { User, Task } from '@/types';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ time: string; element: HTMLElement | null } | null>(null);

  const handleLogin = (username: string, password: string) => {
    setUser({ username, password });
  };

  const handleCreateTask = (taskData: Omit<Task, 'id' | 'status'>) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString(),
      status: 'pending',
    };
    setTasks([...tasks, newTask]);
    setShowTaskForm(false);
  };

  const handleTaskStatusChange = (taskId: string, newStatus: Task['status']) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
  };

  const handleTaskDelete = (taskId: string) => {
    console.log('Deleting task:', taskId);
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };

  const handleTaskMove = (taskId: string, newStartTime: string) => {
    console.log('Moving task:', taskId, 'to new start time:', newStartTime);
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === taskId) {
        const startMinutes = getMinutesFromTime(task.startTime);
        const endMinutes = getMinutesFromTime(task.endTime);
        const duration = endMinutes - startMinutes;
        const newStartMinutes = getMinutesFromTime(newStartTime);
        const newEndMinutes = newStartMinutes + duration;
        const newEndTime = getTimeFromMinutes(newEndMinutes);

        console.log('Task move details:', {
          taskId,
          oldStartTime: task.startTime,
          oldEndTime: task.endTime,
          newStartTime,
          newEndTime,
          duration
        });

        return {
          ...task,
          startTime: newStartTime,
          endTime: newEndTime
        };
      }
      return task;
    }));
  };

  const handleTaskDurationChange = (taskId: string, newStartTime: string, newEndTime: string) => {
    console.log('Changing task duration:', { taskId, newStartTime, newEndTime });
    setTasks(prevTasks => prevTasks.map(task =>
      task.id === taskId ? { ...task, startTime: newStartTime, endTime: newEndTime } : task
    ));
  };

  const handleDragStart = (start: any) => {
    console.log('Drag started', start);
    setIsDragging(true);

    // Store the starting time and element
    const task = tasks.find(t => t.id === start.draggableId);
    const element = document.querySelector(`[data-rbd-draggable-id="${start.draggableId}"]`) as HTMLElement;
    if (task && element) {
      dragStartRef.current = {
        time: task.startTime,
        element
      };
      console.log('Drag start:', { time: task.startTime, element });
    }
  };

  const calculateNewTime = (startTime: string, offsetY: number): string => {
    const startMinutes = getMinutesFromTime(startTime);
    const slotChange = Math.round(offsetY / 30); // 30px per slot
    const newMinutes = startMinutes + (slotChange * 15); // 15 minutes per slot

    // Validate time range (8:00 - 20:00)
    if (newMinutes < 8 * 60) return '08:00';
    if (newMinutes >= 20 * 60) return '20:00';

    const hours = Math.floor(newMinutes / 60);
    const minutes = newMinutes % 60;
    const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    console.log('Time calculation:', { startTime, offsetY, slotChange, newMinutes, time });
    return time;
  };

  const handleDragEnd = (result: DropResult) => {
    console.log('Drag ended:', result);
    setIsDragging(false);
    
    if (!result.destination || !dragStartRef.current || !dragStartRef.current.element) {
      console.log('No destination or start position');
      dragStartRef.current = null;
      return;
    }

    const { draggableId, destination } = result;

    if (destination.droppableId === 'delete-zone') {
      console.log('Dropping in delete zone');
      handleTaskDelete(draggableId);
      dragStartRef.current = null;
      return;
    }

    // Get the timeline element
    const timeline = timelineRef.current;
    if (!timeline) {
      console.log('Timeline element not found');
      dragStartRef.current = null;
      return;
    }

    // Calculate the vertical offset
    const startRect = dragStartRef.current.element.getBoundingClientRect();
    const timelineRect = timeline.getBoundingClientRect();
    const relativeStartY = startRect.top - timelineRect.top;
    const slotIndex = Math.round(relativeStartY / 30); // Each slot is 30px
    const offsetY = (destination.index - slotIndex) * 30;

    console.log('Position calculation:', {
      startY: startRect.top,
      timelineTop: timelineRect.top,
      relativeStartY,
      slotIndex,
      destinationIndex: destination.index,
      offsetY
    });

    // Calculate new time based on the offset
    const newTime = calculateNewTime(dragStartRef.current.time, offsetY);
    if (newTime) {
      console.log('Moving task to:', newTime);
      handleTaskMove(draggableId, newTime);
    }

    dragStartRef.current = null;
  };

  // Helper functions for time calculations
  const getMinutesFromTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours * 60) + minutes;
  };

  const getTimeFromMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <main className="container">
        {!user ? (
          <LoginForm onLogin={handleLogin} />
        ) : (
          <div className="dashboard">
            <div className="header">
              <h1>Welcome, {user.username}</h1>
              <button onClick={() => setShowTaskForm(true)}>Create Task</button>
            </div>
            
            {showTaskForm && (
              <div className="modal">
                <div className="modal-content">
                  <TaskForm
                    onSubmit={handleCreateTask}
                    onCancel={() => setShowTaskForm(false)}
                  />
                </div>
              </div>
            )}

            <div ref={timelineRef}>
              <TimelineGrid
                tasks={tasks}
                onTaskStatusChange={handleTaskStatusChange}
                onTaskDelete={handleTaskDelete}
                onTaskMove={handleTaskMove}
                onTaskDurationChange={handleTaskDurationChange}
              />
            </div>

            <DeleteZone isDragging={isDragging} />
          </div>
        )}

        <style jsx>{`
          .container {
            min-height: 100vh;
            padding: 20px;
          }

          .dashboard {
            max-width: 1200px;
            margin: 0 auto;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }

          .header button {
            padding: 8px 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }

          .header button:hover {
            background: #0056b3;
          }

          .modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
          }

          .modal-content {
            background: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 90%;
            max-height: 90vh;
            overflow-y: auto;
          }
        `}</style>
      </main>
    </DragDropContext>
  );
} 