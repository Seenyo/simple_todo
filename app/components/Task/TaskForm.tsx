import React, { useState, useEffect } from 'react';
import { Task } from '@/types';

interface TaskFormProps {
  onSubmit: (task: Omit<Task, 'id' | 'status'>) => void;
  onCancel: () => void;
  existingTags?: string[];
  initialTask?: Task | null;
}

const TaskForm: React.FC<TaskFormProps> = ({ onSubmit, onCancel, existingTags = [], initialTask }) => {
  const [title, setTitle] = useState(initialTask?.title || '');
  const [details, setDetails] = useState(initialTask?.details || '');
  const [startTime, setStartTime] = useState(initialTask?.startTime || '08:00');
  const [endTime, setEndTime] = useState(initialTask?.endTime || '09:00');
  const [tags, setTags] = useState<string[]>(initialTask?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [timeError, setTimeError] = useState('');
  const [showExistingTags, setShowExistingTags] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDetails(initialTask.details || '');
      setStartTime(initialTask.startTime);
      setEndTime(initialTask.endTime);
      setTags(initialTask.tags);
    }
  }, [initialTask]);

  const validateTimeRange = (start: string, end: string) => {
    const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
    const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
    return endMinutes > startMinutes;
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartTime = e.target.value;
    setStartTime(newStartTime);
    if (!validateTimeRange(newStartTime, endTime)) {
      setTimeError('Start time must be before end time');
    } else {
      setTimeError('');
    }
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndTime = e.target.value;
    setEndTime(newEndTime);
    if (!validateTimeRange(startTime, newEndTime)) {
      setTimeError('End time must be after start time');
    } else {
      setTimeError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateTimeRange(startTime, endTime)) {
      setTimeError('Invalid time range: start time must be before end time');
      return;
    }
    onSubmit({
      title,
      details,
      startTime,
      endTime,
      tags,
    });
  };

  const addTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <h2>{initialTask ? 'Edit Task' : 'Create Task'}</h2>
      <div className="form-group">
        <label htmlFor="title">Title</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="details">Details</label>
        <textarea
          id="details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="startTime">Start Time</label>
          <input
            type="time"
            id="startTime"
            value={startTime}
            onChange={handleStartTimeChange}
            min="08:00"
            max="24:00"
            step="900"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="endTime">End Time</label>
          <input
            type="time"
            id="endTime"
            value={endTime}
            onChange={handleEndTimeChange}
            min="08:00"
            max="24:00"
            step="900"
            required
          />
        </div>
      </div>

      {timeError && (
        <div className="error-message">
          {timeError}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="tags">Tags</label>
        <div className="tag-input">
          <input
            type="text"
            id="tags"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Add a new tag"
          />
          <button type="button" onClick={addTag}>Add Tag</button>
        </div>
        
        {existingTags.length > 0 && (
          <div className="existing-tags">
            <button
              type="button"
              className="toggle-tags"
              onClick={() => setShowExistingTags(!showExistingTags)}
            >
              {showExistingTags ? 'Hide Existing Tags' : 'Show Existing Tags'}
            </button>
            
            {showExistingTags && (
              <div className="existing-tags-list">
                {existingTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`existing-tag ${tags.includes(tag) ? 'selected' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="tags-list">
          {tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
              <button type="button" onClick={() => removeTag(tag)}>&times;</button>
            </span>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button type="submit">{initialTask ? 'Save Changes' : 'Save Task'}</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>

      <style jsx>{`
        .task-form {
          max-width: 500px;
          margin: 0 auto;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .form-group {
          margin-bottom: ${timeError ? '8px' : '15px'};
        }

        .form-row {
          display: flex;
          gap: 15px;
        }

        label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }

        input, textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        textarea {
          min-height: 100px;
          resize: vertical;
        }

        .tag-input {
          display: flex;
          gap: 8px;
        }

        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .tag {
          background: #f0f0f0;
          padding: 4px 8px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .tag button {
          background: none;
          border: none;
          padding: 0 4px;
          cursor: pointer;
          font-size: 16px;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        button[type="submit"] {
          background: #007bff;
          color: white;
        }

        button[type="button"] {
          background: #6c757d;
          color: white;
        }

        button:hover {
          opacity: 0.9;
        }

        .error-message {
          color: #ff3b30;
          font-size: 14px;
          margin: -8px 0 12px;
          padding: 4px 8px;
          background: rgba(255, 59, 48, 0.1);
          border-radius: 4px;
        }

        .existing-tags {
          margin-top: 12px;
        }

        .toggle-tags {
          background: none;
          border: 1px solid #ddd;
          color: #666;
          padding: 4px 12px;
          font-size: 12px;
          margin-bottom: 8px;
        }

        .toggle-tags:hover {
          background: #f8f9fa;
          border-color: #adb5bd;
        }

        .existing-tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .existing-tag {
          background: white;
          border: 1px solid #ddd;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .existing-tag:hover {
          border-color: #adb5bd;
        }

        .existing-tag.selected {
          background: #007bff;
          color: white;
          border-color: #0056b3;
        }

        .existing-tag.selected:hover {
          background: #0056b3;
        }
      `}</style>
    </form>
  );
};

export default TaskForm; 