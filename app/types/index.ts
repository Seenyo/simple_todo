export interface User {
  username: string;
  password: string; // Note: In production, implement proper password hashing
}

export interface Task {
  id: string;
  title: string;
  details?: string;
  startTime: string; // Format: HH:mm
  endTime: string; // Format: HH:mm
  tags: string[];
  status: 'pending' | 'in-progress' | 'complete';
  date?: string; // ISO date string
} 