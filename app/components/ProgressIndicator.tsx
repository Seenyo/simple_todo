import React from 'react';
import { Task } from '@/types';

interface ProgressIndicatorProps {
  tasks: Task[];
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ tasks }) => {
  const calculateProgress = () => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(task => task.status === 'complete').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const progress = calculateProgress();

  return (
    <div className="progress-indicator">
      <div className="progress-content">
        <div className="progress-text">
          <span className="progress-percentage">{progress}%</span>
          <span className="progress-label">Complete</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="progress-stats">
          <span>{tasks.filter(task => task.status === 'complete').length} of {tasks.length} tasks completed</span>
        </div>
      </div>

      <style jsx>{`
        .progress-indicator {
          position: fixed;
          top: 20px;
          right: 20px;
          background: white;
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          min-width: 200px;
          transition: all 0.3s ease;
        }

        .progress-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .progress-text {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .progress-percentage {
          font-size: 24px;
          font-weight: bold;
          color: #007bff;
        }

        .progress-label {
          color: #666;
          font-size: 14px;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: #eee;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #007bff;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .progress-stats {
          font-size: 12px;
          color: #666;
          text-align: center;
        }

        @media (hover: hover) {
          .progress-indicator:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
          }
        }
      `}</style>
    </div>
  );
};

export default ProgressIndicator; 