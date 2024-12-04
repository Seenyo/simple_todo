'use client';

import React, { createContext, useContext, useState } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';

interface DragDropContextValue {
  isDragging: boolean;
  handleDragEnd: (result: DropResult) => void;
}

const DragDropStateContext = createContext<DragDropContextValue | undefined>(undefined);

export function useDragDrop() {
  const context = useContext(DragDropStateContext);
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider');
  }
  return context;
}

interface DragDropProviderProps {
  children: React.ReactNode;
  onDragEnd?: (result: DropResult) => void;
}

export default function DragDropProvider({ children, onDragEnd }: DragDropProviderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = () => {
    setIsDragging(true);
    document.body.classList.add('is-dragging');
  };

  const handleDragEnd = (result: DropResult) => {
    setIsDragging(false);
    document.body.classList.remove('is-dragging');
    onDragEnd?.(result);
  };

  const contextValue: DragDropContextValue = {
    isDragging,
    handleDragEnd
  };

  return (
    <DragDropStateContext.Provider value={contextValue}>
      <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
        {children}
      </DragDropContext>
    </DragDropStateContext.Provider>
  );
} 