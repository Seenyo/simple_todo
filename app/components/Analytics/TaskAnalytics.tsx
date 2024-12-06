'use client';

import React from 'react';
import { Task } from '@/types';
import {
  PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import styles from './TaskAnalytics.module.css';
import { loadTasksFromStorage } from '@/utils/storage';
import { generateTagColor } from '@/utils/colors';

interface TaskAnalyticsProps {
  tasks: Task[];
  userId: string;
  selectedDate: Date;
}

interface TagStats {
  tag: string;
  totalMinutes: number;
  averageMinutesPerDay: number;
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
}

interface DailyTaskStats {
  date: string;
  displayDate: string;
  pending: number;
  'in-progress': number;
  complete: number;
  total: number;
  pendingPercent: number;
  inProgressPercent: number;
  completePercent: number;
  pendingCount: number;
  inProgressCount: number;
  completeCount: number;
}

// Colors for task status: pending (yellow), in-progress (blue), complete (green)
const STATUS_COLORS = ['#FFBB28', '#0088FE', '#00C49F'];

// Helper functions
const getMinutesFromTime = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

const DEBUG_PREFIX = '[TaskAnalytics Debug]';

// Debug function that outputs to terminal
const debugLog = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const debugMessage = `${DEBUG_PREFIX} ${timestamp} - ${message}${data ? ': ' + JSON.stringify(data, null, 2) : ''}`;
  // Using both console.log and echo for development
  console.log(debugMessage);
  // @ts-ignore
  if (typeof window !== 'undefined') {
    fetch('/api/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: debugMessage })
    }).catch(() => {});
  }
};

const TaskAnalytics: React.FC<TaskAnalyticsProps> = ({ tasks, userId, selectedDate }) => {
  const [historicalTasks, setHistoricalTasks] = React.useState<Task[]>([]);

  // Load historical tasks
  React.useEffect(() => {
    const loadHistoricalData = async () => {
      const dates = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(selectedDate);
        date.setDate(selectedDate.getDate() - i);
        return date.toISOString().split('T')[0];
      });

      const allTasks: Task[] = [];
      for (const date of dates) {
        const tasksForDate = await loadTasksFromStorage(userId, date);
        const tasksWithDate = tasksForDate.map(task => ({
          ...task,
          date: task.date || date
        }));
        allTasks.push(...tasksWithDate);
      }
      setHistoricalTasks(allTasks);
    };

    loadHistoricalData();
  }, [userId, selectedDate]);

  // Combine current and historical tasks with deduplication and ensure dates
  const allTasks = React.useMemo(() => {
    const currentTasksWithDates = tasks.map(task => ({
      ...task,
      date: task.date || selectedDate.toISOString().split('T')[0]
    }));

    const taskMap = new Map<string, Task>();
    
    currentTasksWithDates.forEach(task => {
      taskMap.set(task.id, task);
    });
    
    historicalTasks.forEach(task => {
      if (!taskMap.has(task.id)) {
        taskMap.set(task.id, task);
      }
    });
    
    return Array.from(taskMap.values());
  }, [tasks, historicalTasks, selectedDate]);

  // Calculate task status distribution
  const statusDistribution = React.useMemo(() => {
    const distribution = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const orderedStatuses = ['pending', 'in-progress', 'complete'];
    return orderedStatuses.map(status => ({
      name: status,
      value: distribution[status] || 0
    }));
  }, [tasks]);

  // Calculate weekly task distribution based on selected date
  const weeklyDistribution = React.useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(selectedDate);
      date.setDate(selectedDate.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    // Initialize stats for each day
    const dailyStats = dates.reduce((acc, date) => {
      acc[date] = {
        date,
        displayDate: formatDate(date),
        pending: 0,
        'in-progress': 0,
        complete: 0,
        total: 0,
        pendingPercent: 0,
        inProgressPercent: 0,
        completePercent: 0,
        pendingCount: 0,
        inProgressCount: 0,
        completeCount: 0
      };
      return acc;
    }, {} as Record<string, DailyTaskStats>);

    // Count tasks for each day
    allTasks.forEach(task => {
      if (!task.date) return;
      
      if (dailyStats[task.date]) {
        dailyStats[task.date][task.status]++;
        dailyStats[task.date].total = (
          dailyStats[task.date].pending +
          dailyStats[task.date]['in-progress'] +
          dailyStats[task.date].complete
        );
      }
    });

    // Convert to array and calculate percentages
    const processedData = Object.values(dailyStats).map(stats => {
      const total = stats.total;
      const pending = stats.pending;
      const inProgress = stats['in-progress'];
      const complete = stats.complete;

      return {
        date: stats.date,
        displayDate: stats.displayDate,
        pending,
        'in-progress': inProgress,
        complete,
        total,
        pendingCount: pending,
        inProgressCount: inProgress,
        completeCount: complete,
        pendingPercent: total > 0 ? (pending / total) * 100 : 0,
        inProgressPercent: total > 0 ? (inProgress / total) * 100 : 0,
        completePercent: total > 0 ? (complete / total) * 100 : 0
      };
    });

    return processedData;
  }, [allTasks, selectedDate]);

  // Find maximum total tasks for any day
  const maxTotalTasks = React.useMemo(() => {
    return Math.max(...weeklyDistribution.map(day => day.total), 1);
  }, [weeklyDistribution]);

  // Calculate tag statistics using all tasks
  const tagStats = React.useMemo(() => {
    const tagData = new Map<string, {
      totalMinutes: number;
      totalTasks: number;
      completedTasks: number;
      dates: Set<string>;
    }>();

    allTasks.forEach(task => {
      const startMinutes = getMinutesFromTime(task.startTime);
      const endMinutes = getMinutesFromTime(task.endTime);
      const duration = endMinutes - startMinutes;
      const date = task.date || new Date().toISOString().split('T')[0];

      task.tags.forEach(tag => {
        const stats = tagData.get(tag) || {
          totalMinutes: 0,
          totalTasks: 0,
          completedTasks: 0,
          dates: new Set<string>()
        };

        stats.totalMinutes += duration;
        stats.totalTasks += 1;
        if (task.status === 'complete') {
          stats.completedTasks += 1;
        }
        stats.dates.add(date);

        tagData.set(tag, stats);
      });
    });

    const tagStatsArray: TagStats[] = Array.from(tagData.entries()).map(([tag, stats]) => ({
      tag,
      totalMinutes: stats.totalMinutes,
      averageMinutesPerDay: Math.round(stats.totalMinutes / stats.dates.size),
      completionRate: (stats.completedTasks / stats.totalTasks) * 100,
      totalTasks: stats.totalTasks,
      completedTasks: stats.completedTasks
    }));

    return tagStatsArray
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .slice(0, 3);
  }, [allTasks]);

  return (
    <div className={styles.analyticsContainer}>
      <h1>Task Analytics</h1>
      
      <div className={styles.chartSection}>
        <h2>Task Status Distribution</h2>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusDistribution.filter(item => item.value > 0)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusDistribution.map((entry, index) => (
                  entry.value > 0 ? <Cell key={`cell-${index}`} fill={STATUS_COLORS[index]} /> : null
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.chartSection}>
        <h2>Weekly Task Distribution</h2>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="displayDate" />
              <YAxis 
                domain={[0, maxTotalTasks]}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  
                  return (
                    <div className={styles.customTooltip}>
                      <p className={styles.tooltipLabel}>{`Tasks on ${label}`}</p>
                      {payload.map((entry: any, index: number) => {
                        const name = entry.name;
                        const count = entry.value;
                        const total = entry.payload.total;
                        const percent = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
                        return (
                          <p key={index} style={{ color: entry.color }}>
                            {`${name}: ${count} tasks (${percent}%)`}
                          </p>
                        );
                      })}
                    </div>
                  );
                }}
              />
              <Legend />
              <Bar 
                dataKey="pending" 
                stackId="a" 
                fill={STATUS_COLORS[0]} 
                name="Pending"
              />
              <Bar 
                dataKey="in-progress" 
                stackId="a" 
                fill={STATUS_COLORS[1]} 
                name="In Progress"
              />
              <Bar 
                dataKey="complete" 
                stackId="a" 
                fill={STATUS_COLORS[2]} 
                name="Complete"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.chartSection}>
        <h2>Top 3 Tags Analysis</h2>
        <div className={styles.tagStatsGrid}>
          {tagStats.map((stat, index) => {
            const tagColor = generateTagColor(stat.tag, index);
            return (
              <div key={stat.tag} className={styles.tagStatCard}>
                <h3 style={{ color: tagColor }}>{stat.tag}</h3>
                <div className={styles.tagStatDetails}>
                  <p>Total Time: {formatMinutes(stat.totalMinutes)}</p>
                  <p>Daily Average: {formatMinutes(stat.averageMinutesPerDay)}</p>
                  <div className={styles.completionRateContainer}>
                    <div 
                      className={styles.completionRateBar}
                      style={{ 
                        width: `${stat.completionRate}%`,
                        backgroundColor: tagColor
                      }}
                    />
                  </div>
                  <p className={styles.taskCount}>
                    {stat.completedTasks} / {stat.totalTasks} tasks completed
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TaskAnalytics; 