import React from 'react';

interface TagFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onTagSelect: (tag: string) => void;
}

const TagFilter: React.FC<TagFilterProps> = ({ availableTags, selectedTags, onTagSelect }) => {
  return (
    <div className="tag-filter">
      {availableTags.map(tag => (
        <button
          key={tag}
          className={`tag-button ${selectedTags.includes(tag) ? 'selected' : ''}`}
          onClick={() => onTagSelect(tag)}
        >
          {tag}
        </button>
      ))}

      <style jsx>{`
        .tag-filter {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }

        .tag-button {
          padding: 4px 12px;
          border-radius: 16px;
          border: 1px solid #ddd;
          background: white;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .tag-button:hover {
          background: #f8f9fa;
          border-color: #adb5bd;
        }

        .tag-button.selected {
          background: #007bff;
          color: white;
          border-color: #0056b3;
        }

        .tag-button.selected:hover {
          background: #0056b3;
        }
      `}</style>
    </div>
  );
};

export default TagFilter; 