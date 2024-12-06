'use client';

import React, { useState, useRef, useEffect } from 'react';
import LoginForm from '@/components/Auth/LoginForm';
import TimelineGrid from '@/components/Timeline/TimelineGrid';
import TaskForm from '@/components/Task/TaskForm';
import DeleteZone from '@/components/Task/DeleteZone';
import TagFilter from '@/components/Task/TagFilter';
import ProgressIndicator from '@/components/ProgressIndicator';
import TaskAnalytics from '@/components/Analytics/TaskAnalytics';
import { User, Task } from '@/types';
import { saveTasksToStorage, loadTasksFromStorage, formatDate } from '@/utils/storage';

interface ConflictInfo {
  newTask: Task;
  conflictingTasks: Task[];
  onConfirm: () => void;
  onCancel: () => void;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Load tasks when user logs in or date changes
  useEffect(() => {
    const loadTasks = async () => {
      if (user) {
        const loadedTasks = await loadTasksFromStorage(user.username, formatDate(selectedDate));
        setTasks(loadedTasks);
      }
    };
    loadTasks();
  }, [user, selectedDate]);

  // Save tasks whenever they change
  useEffect(() => {
    const saveTasks = async () => {
      if (user) {
        await saveTasksToStorage(user.username, formatDate(selectedDate), tasks);
      }
    };
    saveTasks();
  }, [tasks, user, selectedDate]);

  const handleLogin = (username: string, password: string) => {
    setUser({ username, password });
  };

  const handleDateChange = async (newDate: Date) => {
    setSelectedDate(newDate);
  };

  // Helper function to check for task conflicts
  const findConflictingTasks = (startTime: string, endTime: string, excludeTaskId?: string) => {
    const newStartMinutes = getMinutesFromTime(startTime);
    const newEndMinutes = getMinutesFromTime(endTime);

    return tasks.filter(task => {
      if (excludeTaskId && task.id === excludeTaskId) return false;
      
      const taskStartMinutes = getMinutesFromTime(task.startTime);
      const taskEndMinutes = getMinutesFromTime(task.endTime);

      return (
        (newStartMinutes < taskEndMinutes && newEndMinutes > taskStartMinutes) ||
        (taskStartMinutes < newEndMinutes && taskEndMinutes > newStartMinutes)
      );
    }).sort((a, b) => getMinutesFromTime(a.startTime) - getMinutesFromTime(b.startTime));
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

  // Helper function to adjust task times to fit within boundaries
  const adjustTaskTime = (startTime: string, endTime: string) => {
    const minStartMinutes = 8 * 60;  // 8:00
    const maxEndMinutes = 24 * 60;   // 24:00
    const endMinutes = getMinutesFromTime(endTime);
    const startMinutes = getMinutesFromTime(startTime);
    const duration = endMinutes - startMinutes;
    
    // If end time would be after 24:00
    if (endMinutes > maxEndMinutes) {
      // Calculate new start time by working backwards from 24:00
      const newStartMinutes = maxEndMinutes - duration;
      // If new start time would be before 8:00, adjust both times
      if (newStartMinutes < minStartMinutes) {
        return {
          startTime: getTimeFromMinutes(minStartMinutes),
          endTime: getTimeFromMinutes(minStartMinutes + duration)
        };
      }
      return {
        startTime: getTimeFromMinutes(newStartMinutes),
        endTime: getTimeFromMinutes(maxEndMinutes)
      };
    }
    
    // If start time would be before 8:00
    if (startMinutes < minStartMinutes) {
      return {
        startTime: getTimeFromMinutes(minStartMinutes),
        endTime: getTimeFromMinutes(minStartMinutes + duration)
      };
    }
    
    return { startTime, endTime };
  };

  // Helper function to adjust conflicting tasks
  const adjustConflictingTasks = (newTask: Task, conflictingTasks: Task[]) => {
    let lastEndTime = newTask.endTime;
    
    return conflictingTasks.map(task => {
      const taskStartMinutes = getMinutesFromTime(task.startTime);
      const taskEndMinutes = getMinutesFromTime(task.endTime);
      const duration = taskEndMinutes - taskStartMinutes;
      
      const newStartMinutes = getMinutesFromTime(lastEndTime);
      const newEndMinutes = newStartMinutes + duration;
      
      // If this would push the task past 24:00
      const maxEndMinutes = 24 * 60;
      const minStartMinutes = 8 * 60;
      
      if (newEndMinutes > maxEndMinutes) {
        // Try to fit the task by moving it earlier
        const adjustedStartMinutes = maxEndMinutes - duration;
        if (adjustedStartMinutes >= minStartMinutes) {
          const adjustedTimes = {
            startTime: getTimeFromMinutes(adjustedStartMinutes),
            endTime: getTimeFromMinutes(maxEndMinutes)
          };
          lastEndTime = adjustedTimes.endTime;
          return {
            ...task,
            ...adjustedTimes
          };
        }
      }
      
      const adjustedTimes = {
        startTime: lastEndTime,
        endTime: getTimeFromMinutes(newEndMinutes)
      };
      lastEndTime = adjustedTimes.endTime;
      
      return {
        ...task,
        ...adjustedTimes
      };
    });
  };

  const handleCreateTask = (taskData: Omit<Task, 'id' | 'status'>) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString(),
      status: 'pending',
    };

    const conflictingTasks = findConflictingTasks(newTask.startTime, newTask.endTime);
    
    if (conflictingTasks.length > 0) {
      setConflictInfo({
        newTask,
        conflictingTasks,
        onConfirm: () => {
          const adjustedTasks = adjustConflictingTasks(newTask, conflictingTasks);
          setTasks(prevTasks => [
            ...prevTasks.filter(task => !conflictingTasks.find(t => t.id === task.id)),
            ...adjustedTasks,
            newTask
          ]);
          setShowTaskForm(false);
          setConflictInfo(null);
        },
        onCancel: () => {
          setConflictInfo(null);
        }
      });
    } else {
      setTasks([...tasks, newTask]);
      setShowTaskForm(false);
    }
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
    
    // First adjust the time to be within boundaries
    const adjustedTimes = adjustTaskTime(newStartTime, newEndTime);
    
    // Then check for conflicts with other tasks
    const conflictingTasks = findConflictingTasks(adjustedTimes.startTime, adjustedTimes.endTime, taskId);
    
    if (conflictingTasks.length > 0) {
      // Adjust the conflicting tasks
      const adjustedConflictingTasks = adjustConflictingTasks(
        { ...tasks.find(t => t.id === taskId)!, ...adjustedTimes },
        conflictingTasks
      );

      setTasks(prevTasks => [
        ...prevTasks.filter(task => 
          task.id !== taskId && !conflictingTasks.find(t => t.id === task.id)
        ),
        { ...prevTasks.find(t => t.id === taskId)!, ...adjustedTimes },
        ...adjustedConflictingTasks
      ]);
    } else {
      setTasks(prevTasks => prevTasks.map(task =>
        task.id === taskId ? { ...task, ...adjustedTimes } : task
      ));
    }
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

  // Get unique tags from all tasks
  const availableTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    tasks.forEach(task => {
      task.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [tasks]);

  // Filter tasks based on selected tags
  const filteredTasks = React.useMemo(() => {
    if (selectedTags.length === 0) return tasks;
    return tasks.filter(task => 
      selectedTags.some(tag => task.tags.includes(tag))
    );
  }, [tasks, selectedTags]);

  const handleTagSelect = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleEditTask = (taskToEdit: Task) => {
    setEditingTask(taskToEdit);
    setShowTaskForm(true);
  };

  const handleTaskSubmit = (taskData: Omit<Task, 'id' | 'status'>) => {
    if (editingTask) {
      // Handle editing existing task
      const updatedTask = {
        ...editingTask,
        ...taskData
      };

      const otherTasks = tasks.filter(t => t.id !== editingTask.id);
      const conflictingTasks = findConflictingTasks(taskData.startTime, taskData.endTime, editingTask.id);

      if (conflictingTasks.length > 0) {
        setConflictInfo({
          newTask: updatedTask,
          conflictingTasks,
          onConfirm: () => {
            const adjustedTasks = adjustConflictingTasks(updatedTask, conflictingTasks);
            setTasks([
              ...otherTasks.filter(task => !conflictingTasks.find(t => t.id === task.id)),
              ...adjustedTasks,
              updatedTask
            ]);
            setShowTaskForm(false);
            setEditingTask(null);
            setConflictInfo(null);
          },
          onCancel: () => {
            setConflictInfo(null);
          }
        });
      } else {
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === editingTask.id ? updatedTask : task
          )
        );
        setShowTaskForm(false);
        setEditingTask(null);
      }
    } else {
      // Handle creating new task
      handleCreateTask(taskData);
    }
  };

  return (
    <main className="container">
      {!user ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        <div className="dashboard">
          <div className="header">
            <h1>Welcome, {user.username}</h1>
            <div className="header-controls">
              <button onClick={() => setShowAnalytics(!showAnalytics)} className="analytics-toggle">
                {showAnalytics ? 'Show Timeline' : 'Show Analytics'}
              </button>
              {!showAnalytics && (
                <button onClick={() => {
                  setEditingTask(null);
                  setShowTaskForm(true);
                }}>Create Task</button>
              )}
            </div>
          </div>

          {!showAnalytics && (
            <>
              <TagFilter
                availableTags={availableTags}
                selectedTags={selectedTags}
                onTagSelect={handleTagSelect}
              />

              <ProgressIndicator tasks={tasks} />
            </>
          )}
          
          {showTaskForm && !showAnalytics && (
            <div className="modal">
              <div className="modal-content">
                <TaskForm
                  onSubmit={handleTaskSubmit}
                  onCancel={() => {
                    setShowTaskForm(false);
                    setEditingTask(null);
                  }}
                  existingTags={availableTags}
                  initialTask={editingTask}
                />
              </div>
            </div>
          )}

          {conflictInfo && !showAnalytics && (
            <div className="modal">
              <div className="modal-content warning">
                <h3>Time Conflict Warning</h3>
                <p>The new task conflicts with the following existing tasks:</p>
                <ul>
                  {conflictInfo.conflictingTasks.map(task => (
                    <li key={task.id}>
                      {task.title} ({task.startTime} - {task.endTime})
                    </li>
                  ))}
                </ul>
                <p>Would you like to automatically adjust the conflicting tasks?</p>
                <div className="warning-actions">
                  <button onClick={conflictInfo.onConfirm} className="confirm">
                    OK (Adjust Tasks)
                  </button>
                  <button onClick={conflictInfo.onCancel} className="cancel">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {showAnalytics ? (
            <TaskAnalytics 
              tasks={tasks} 
              userId={user.username} 
              selectedDate={selectedDate}
            />
          ) : (
            <div ref={timelineRef}>
              <TimelineGrid
                tasks={filteredTasks}
                onTaskStatusChange={handleTaskStatusChange}
                onTaskDelete={handleTaskDelete}
                onTaskMove={handleTaskMove}
                onTaskDurationChange={handleTaskDurationChange}
                onDateChange={handleDateChange}
                onEdit={handleEditTask}
              />
            </div>
          )}

          {!showAnalytics && (
            <DeleteZone 
              isDragging={isDragging} 
              onDelete={handleTaskDelete}
            />
          )}
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

        .header-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .header button {
          padding: 8px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .header button:hover {
          background: #0056b3;
        }

        .header button.analytics-toggle {
          background: #6c757d;
        }

        .header button.analytics-toggle:hover {
          background: #5a6268;
        }

        .analytics-view {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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

        .warning {
          background: white;
          padding: 24px;
          border-radius: 8px;
          max-width: 500px;
        }

        .warning h3 {
          margin: 0 0 16px;
          color: #ff3b30;
        }

        .warning p {
          margin: 16px 0;
        }

        .warning ul {
          margin: 12px 0;
          padding-left: 24px;
        }

        .warning li {
          margin: 8px 0;
          color: #666;
        }

        .warning-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }

        .warning-actions button {
          padding: 8px 16px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-weight: 500;
        }

        .warning-actions .confirm {
          background: #007bff;
          color: white;
        }

        .warning-actions .confirm:hover {
          background: #0056b3;
        }

        .warning-actions .cancel {
          background: #f8f9fa;
          border: 1px solid #ddd;
        }

        .warning-actions .cancel:hover {
          background: #e9ecef;
        }

        .date-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .current-date {
          font-weight: 500;
          color: #333;
          margin: 0 12px;
        }
      `}</style>
    </main>
  );
}
