import { useState, useEffect } from 'react';
import usePermissions from './usePermissions';
import { Board } from '../types';

interface DragItem {
  id: string;
  type: 'card' | 'list';
  sourceId: string;
}

export const useDragAndDrop = (board?: Board | null) => {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const permissions = usePermissions(board);

  // If permissions change and user no longer has edit rights, clear any dragged item
  useEffect(() => {
    if (!permissions.canEdit && draggedItem) {
      setDraggedItem(null);
    }
  }, [permissions.canEdit, draggedItem]);

  const handleDragStart = (id: string, type: 'card' | 'list', sourceId: string) => {
    // Only allow drag if user has edit permission
    if (permissions.canEdit) {
      setDraggedItem({ id, type, sourceId });
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    // Only allow drag over if user has edit permission
    if (permissions.canEdit) {
      e.preventDefault();
    }
  };

  return {
    draggedItem,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    canDrag: permissions.canEdit
  };
};