'use client';

import React from 'react';
import { Task } from '@/types';
import {
  PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import styles from './TaskAnalytics.module.css';

interface TaskAnalyticsProps {
  tasks: Task[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const TaskAnalytics: React.FC<TaskAnalyticsProps> = ({ tasks }) => {
  // Calculate task status distribution
  const statusDistribution = React.useMemo(() => {
    const distribution = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value
    }));
  }, [tasks]);

  // Calculate hourly task distribution
  const hourlyDistribution = React.useMemo(() => {
    const hours = Array.from({ length: 17 }, (_, i) => i + 8); // 8:00 to 24:00
    return hours.map(hour => {
      const count = tasks.filter(task => {
        const taskHour = parseInt(task.startTime.split(':')[0]);
        return taskHour === hour;
      }).length;
      return {
        hour: `${hour}:00`,
        count
      };
    });
  }, [tasks]);

  return (
    <div className={styles.analyticsContainer}>
      <h1>Task Analytics</h1>
      
      <div className={styles.chartSection}>
        <h2>Task Status Distribution</h2>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.chartSection}>
        <h2>Tasks by Hour</h2>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
                name="Number of Tasks"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TaskAnalytics; 