'use client';

import React, { useState, useRef } from 'react';
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

  const handleDragStart = () => {
    console.log('Drag started');
    setIsDragging(true);
  };

  const handleDragStop = (taskId: string, deltaY: number) => {
    console.log(`Task ${taskId} moved by deltaY: ${deltaY}`);
    // Calculate the number of 15-minute slots moved
    const slotChange = Math.round(deltaY / 30); // 30px per slot corresponds to 15 minutes
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const startMinutes = getMinutesFromTime(task.startTime);
    const newStartMinutes = startMinutes + (slotChange * 15);

    // Validate time range (8:00 - 20:00)
    if (newStartMinutes < 8 * 60 || newStartMinutes + (getMinutesFromTime(task.endTime) - startMinutes) > 20 * 60) {
      console.log('New time out of bounds. Reverting to original time.');
      setIsDragging(false);
      return; // Do not allow moving outside the timeline
    }

    const newStartTime = getTimeFromMinutes(newStartMinutes);
    const newEndMinutes = getMinutesFromTime(task.endTime) + (slotChange * 15);
    const newEndTime = getTimeFromMinutes(newEndMinutes);

    console.log('Updating task times:', { newStartTime, newEndTime });

    handleTaskMove(taskId, newStartTime);
    handleTaskDurationChange(taskId, newStartTime, newEndTime);
    setIsDragging(false);
  };

  return (
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

          <DeleteZone 
            isDragging={isDragging} 
            onDelete={handleTaskDelete}
          />
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
  );
}
