import { Task } from '@/types';

interface TaskStorage {
  [userId: string]: {
    [date: string]: Task[];
  };
}

const LOCAL_STORAGE_KEY = 'timeline_tasks';

export const saveTasksToStorage = async (userId: string, date: string, tasks: Task[]): Promise<boolean> => {
  try {
    // Save to localStorage
    const storageData = localStorage.getItem(LOCAL_STORAGE_KEY);
    const storage: TaskStorage = storageData ? JSON.parse(storageData) : {};
    
    if (!storage[userId]) {
      storage[userId] = {};
    }
    storage[userId][date] = tasks;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storage));

    // Save to server
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, date, tasks }),
    });

    if (!response.ok) {
      throw new Error('Failed to save tasks to server');
    }

    return true;
  } catch (error) {
    console.error('Error saving tasks:', error);
    return false;
  }
};

export const loadTasksFromStorage = async (userId: string, date: string): Promise<Task[]> => {
  try {
    // Try to load from localStorage first
    const storageData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storageData) {
      const storage: TaskStorage = JSON.parse(storageData);
      if (storage[userId]?.[date]) {
        return storage[userId][date];
      }
    }

    // If not in localStorage, fetch from server
    const response = await fetch(`/api/tasks?userId=${userId}&date=${date}`);
    if (!response.ok) {
      throw new Error('Failed to load tasks from server');
    }

    const tasks = await response.json();
    
    // Update localStorage with fetched data
    const storage: TaskStorage = storageData ? JSON.parse(storageData) : {};
    if (!storage[userId]) {
      storage[userId] = {};
    }
    storage[userId][date] = tasks;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storage));

    return tasks;
  } catch (error) {
    console.error('Error loading tasks:', error);
    return [];
  }
};

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
}; 