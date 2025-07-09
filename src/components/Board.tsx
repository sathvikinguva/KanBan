import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, Users, Trash2, Eye } from 'lucide-react';
import { Board as BoardType, List, Card } from '../types';
import { getBoardById, getLists, getAllCards, createList, deleteBoard, deleteList } from '../utils/storage';
import { searchCards } from '../utils/helpers';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { useAuth } from '../contexts/AuthContext';
import usePermissions from '../hooks/usePermissions';
import Navbar from './Navbar';
import BoardList from './BoardList';
import CardModal from './CardModal';
import InviteModal from './InviteModal';

const Board: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [board, setBoard] = useState<BoardType | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddList, setShowAddList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Get permissions based on the user's role
  const permissions = usePermissions(board);

  const { draggedItem, handleDragStart, handleDragEnd, handleDragOver } = useDragAndDrop(board);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBoardData = async () => {
      if (!boardId || !user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log("Loading board data for boardId:", boardId, "userId:", user.id);
        const boardData = await getBoardById(boardId, user.id);
        
        if (boardData) {
          console.log("Board data loaded:", boardData);
          setBoard(boardData);
          
          try {
            console.log("Loading lists for board:", boardId);
            const boardLists = await getLists(boardId);
            console.log("Lists loaded:", boardLists);
            setLists(boardLists);
            
            try {
              console.log("Loading all cards for board:", boardId);
              const cards = await getAllCards(boardId);
              console.log("Cards loaded:", cards);
              setAllCards(cards);
            } catch (cardError) {
              console.error("Error loading cards:", cardError);
              setError("Failed to load cards. Please refresh the page.");
            }
          } catch (listError) {
            console.error("Error loading lists:", listError);
            setError("Failed to load lists. Please refresh the page.");
          }
        } else {
          setError("Board not found or you don't have access to it.");
        }
      } catch (boardError) {
        console.error("Error loading board:", boardError);
        setError("Failed to load board. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };
    
    loadBoardData();
  }, [boardId, user]);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardId || !newListTitle.trim()) return;

    const newListData: Omit<List, 'id'> = {
      boardId,
      title: newListTitle.trim(),
      order: lists.length,
      createdAt: new Date()
    };

    try {
      const listId = await createList(newListData);
      const newList = { ...newListData, id: listId };
      setLists(prev => [...prev, newList]);
      setNewListTitle('');
      setShowAddList(false);
    } catch (error) {
      console.error('Error creating list:', error);
      alert('Failed to create list. Please try again.');
    }
  };

  const handleDeleteBoard = async () => {
    if (!boardId || !board) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete the board "${board.title}"? This action cannot be undone and will delete all lists and cards.`);
    if (confirmed) {
      await deleteBoard(boardId);
      navigate('/dashboard');
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await deleteList(listId);
      setLists(prev => prev.filter(list => list.id !== listId));
      setAllCards(prev => prev.filter(card => card.listId !== listId));
    } catch (error) {
      console.error('Error deleting list:', error);
      alert('Failed to delete list. Please try again.');
    }
  };

  const filteredCards = searchQuery ? searchCards(allCards, searchQuery) : allCards;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Loading board...</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {error || "Board not found"}
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {!error && "The board you're looking for doesn't exist or you don't have access to it."}
          </p>
          <div className="mt-6">
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      <Navbar />
      
      <div className="px-4 py-6">
        {board?.members.find(m => m.userId === user?.id)?.role === 'viewer' && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-700 dark:text-blue-400 text-sm flex items-center">
            <Eye className="h-4 w-4 mr-2" /> 
            <span>You are in view-only mode. You can see all content but cannot make changes.</span>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {board.title}
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {board.members.length} member{board.members.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-64 premium-scrollbar"
              />
            </div>
            
            {permissions.canInvite && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
              >
                <Users className="h-4 w-4 mr-2" />
                Invite
              </button>
            )}
            
            {permissions.canDelete && (
              <button
                onClick={handleDeleteBoard}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Board
              </button>
            )}
            
            {/* Role indicator */}
            <div className="inline-flex items-center px-3 py-2 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800">
              {board.members.find(m => m.userId === user?.id)?.role === 'viewer' ? 
                'View Only' : 
                board.members.find(m => m.userId === user?.id)?.role === 'editor' ? 
                'Editor' : 'Owner'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 pb-6 glass-scrollbar">
          {lists.map((list) => (
            <div key={list.id} className="flex-shrink-0" style={{ 
              flexBasis: 'calc(25% - 1.125rem)', 
              maxWidth: 'calc(25% - 1.125rem)', 
              minWidth: '300px' 
            }}>                <BoardList
                list={list}
                cards={allCards.filter(card => card.listId === list.id)}
                filteredCards={filteredCards.filter(card => card.listId === list.id)}
                canEdit={permissions.canEdit}
                onCardClick={setSelectedCard}
                onCardsUpdate={setAllCards}
                onListDelete={handleDeleteList}
                draggedItem={draggedItem}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
              />
            </div>
          ))}
          
          {/* Add list form/button - only shown to users with edit permissions */}
          {permissions.canEdit && (
          <div className="flex-shrink-0" style={{ 
            flexBasis: 'calc(25% - 1.125rem)', 
            maxWidth: 'calc(25% - 1.125rem)', 
            minWidth: '300px' 
          }}>
            {showAddList ? (
              <form onSubmit={handleCreateList} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Enter list title..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-3"
                  autoFocus
                />
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={!newListTitle.trim()}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    Add List
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddList(false);
                      setNewListTitle('');
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAddList(true)}
                className="w-full p-3 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 transition-colors flex items-center justify-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add another list
              </button>
            )}
          </div>
          )}
        </div>
      </div>

      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdate={(updatedCard) => {
            setAllCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
            setSelectedCard(updatedCard);
          }}
        />
      )}

      {showInviteModal && (
        <InviteModal
          board={board}
          onClose={() => setShowInviteModal(false)}
          onUpdate={setBoard}
        />
      )}
    </div>
  );
};

export default Board;