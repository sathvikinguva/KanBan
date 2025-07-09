import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { List, Card } from '../types';
import { createCard, updateCard, deleteList, deleteCard } from '../utils/storage';
import CardComponent from './Card';

interface BoardListProps {
  list: List;
  cards: Card[];
  filteredCards: Card[];
  canEdit?: boolean; // Added permission prop
  onCardClick: (card: Card) => void;
  onCardsUpdate: React.Dispatch<React.SetStateAction<Card[]>>;
  onListDelete: (listId: string) => void;
  draggedItem: any;
  onDragStart: (id: string, type: 'card' | 'list', sourceId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
}

const BoardList: React.FC<BoardListProps> = ({
  list,
  cards,
  filteredCards,
  canEdit = true, // Default to true for backward compatibility
  onCardClick,
  onCardsUpdate,
  onListDelete,
  draggedItem,
  onDragStart,
  onDragEnd,
  onDragOver
}) => {
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;

    const newCardData: Omit<Card, 'id'> = {
      listId: list.id,
      boardId: list.boardId,  // Add board ID from the list
      title: newCardTitle.trim(),
      description: '',
      assignees: [],
      order: cards.length,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const cardId = await createCard(newCardData);
      const newCard = { ...newCardData, id: cardId };
      const updatedCards = [...cards, newCard];
      onCardsUpdate(prev => [...prev.filter(c => c.listId !== list.id), ...updatedCards]);
      setNewCardTitle('');
      setShowAddCard(false);
    } catch (error) {
      console.error('Error creating card:', error);
      alert('Failed to create card. Please try again.');
    }
  };

  const handleDeleteList = async () => {
    const confirmed = window.confirm(`Are you sure you want to delete the list "${list.title}"? This will also delete all cards in this list.`);
    if (confirmed) {
      try {
        await deleteList(list.id);
        onListDelete(list.id);
      } catch (error) {
        console.error('Error deleting list:', error);
        alert('Failed to delete list. Please try again.');
      }
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await deleteCard(cardId);
      onCardsUpdate(prev => prev.filter(card => card.id !== cardId));
    } catch (error) {
      console.error('Error deleting card:', error);
      alert('Failed to delete card. Please try again.');
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.type !== 'card') return;

    if (draggedItem.sourceId !== list.id) {
      try {
        // Move card to this list
        await updateCard(draggedItem.id, { listId: list.id, order: cards.length });
        
        // Update cards state
        onCardsUpdate(prev => {
          return prev.map(card => 
            card.id === draggedItem.id 
              ? { ...card, listId: list.id, order: cards.length }
              : card
          );
        });
      } catch (error) {
        console.error('Error moving card:', error);
        alert('Failed to move card. Please try again.');
      }
    }
    
    onDragEnd();
  };

  return (
    <div 
      className="w-full"
      onDragOver={onDragOver}
      onDrop={handleDrop}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 group">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {list.title}
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {filteredCards.length} card{filteredCards.length !== 1 ? 's' : ''}
              </span>
            </div>
            {canEdit && (
              <button
                onClick={handleDeleteList}
                className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded opacity-0 group-hover:opacity-100"
                title="Delete list"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        <div className="p-3 space-y-3 max-h-96 overflow-y-auto premium-scrollbar">
          {filteredCards.map((card) => (
            <CardComponent
              key={card.id}
              card={card}
              canEdit={canEdit}
              onClick={() => onCardClick(card)}
              onDragStart={() => canEdit && onDragStart(card.id, 'card', list.id)}
              onDragEnd={onDragEnd}
              onDelete={handleDeleteCard}
            />
          ))}
        </div>
        
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          {showAddCard ? (
            <form onSubmit={handleCreateCard}>
              <textarea
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="Enter a title for this card..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex space-x-2 mt-2">
                <button
                  type="submit"
                  disabled={!newCardTitle.trim()}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  Add Card
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCard(false);
                    setNewCardTitle('');
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            canEdit ? (
              <button
                onClick={() => setShowAddCard(true)}
                className="w-full p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add a card
              </button>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
};

export default BoardList;