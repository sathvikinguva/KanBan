import React, { useState, useEffect } from 'react';
import { Calendar, MessageCircle, User, Trash2 } from 'lucide-react';
import { Card as CardType, Comment } from '../types';
import { formatDate, isOverdue } from '../utils/helpers';
import { getComments } from '../utils/storage';

interface CardProps {
  card: CardType;
  canEdit?: boolean; // New prop for permissions
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDelete: (cardId: string) => void;
}

const Card: React.FC<CardProps> = ({ card, canEdit = true, onClick, onDragStart, onDragEnd, onDelete }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const hasOverdueDate = card.dueDate && isOverdue(card.dueDate);

  useEffect(() => {
    const loadComments = async () => {
      try {
        const cardComments = await getComments(card.id);
        setComments(cardComments);
      } catch (error) {
        console.error('Error loading comments:', error);
        setComments([]);
      }
    };
    
    loadComments();
  }, [card.id]);

  const handleDeleteCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Are you sure you want to delete the card "${card.title}"?`);
    if (confirmed) {
      onDelete(card.id);
    }
  };

  // Safety check for date formatting
  const safeDateFormat = (date: any) => {
    try {
      return formatDate(date);
    } catch (error) {
      console.warn('Invalid date in card:', card.id, date);
      return 'Invalid Date';
    }
  };

  return (
    <div
      className={`bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md cursor-pointer transition-all duration-200 group relative ${!canEdit ? 'opacity-90' : ''}`}
      onClick={onClick}
      draggable={canEdit}
      onDragStart={canEdit ? (e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      } : undefined}
      onDragEnd={canEdit ? onDragEnd : undefined}
    >
      {!canEdit && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 opacity-10 pointer-events-none rounded-lg"></div>
      )}
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-1">
          {card.title}
        </h4>
        {canEdit && (
          <button
            onClick={handleDeleteCard}
            className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded opacity-0 group-hover:opacity-100"
            title="Delete card"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {card.description && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {card.description}
        </p>
      )}
      
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-2">
          {card.dueDate && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
              hasOverdueDate 
                ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
                : 'bg-gray-100 dark:bg-gray-600'
            }`}>
              <Calendar className="h-3 w-3" />
              <span>{safeDateFormat(card.dueDate)}</span>
            </div>
          )}
          
          {comments.length > 0 && (
            <div className="flex items-center space-x-1">
              <MessageCircle className="h-3 w-3" />
              <span>{comments.length}</span>
            </div>
          )}
        </div>
        
        {card.assignees.length > 0 && (
          <div className="flex items-center space-x-1">
            <User className="h-3 w-3" />
            <span>{card.assignees.length}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;