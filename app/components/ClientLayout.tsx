'use client';

import React from 'react';
import { DropResult } from 'react-beautiful-dnd';
import DragDropProvider from './DragDropProvider';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const handleDragEnd = (result: DropResult) => {
    // The actual drag end handling will be done in the page component
    // This is just to satisfy the DragDropContext requirement
  };

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      {children}
    </DragDropProvider>
  );
} 