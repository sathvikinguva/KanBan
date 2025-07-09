import React, { useState, useEffect } from 'react';
import { X, Calendar, MessageCircle, Save, Clock, Eye } from 'lucide-react';
import { Card, Comment, Board } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { updateCard, getComments, createComment, getCardById, getBoardById } from '../utils/storage';
import { formatDateTime } from '../utils/helpers';
import { getUserProfile } from '../services/auth';
import CardAssignees from './CardAssignees';
import usePermissions from '../hooks/usePermissions';

interface CardModalProps {
  card: Card;
  onClose: () => void;
  onUpdate: (card: Card) => void;
}

const CardModal: React.FC<CardModalProps> = ({ card, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const permissions = usePermissions(board);
  
  console.log("CardModal - Initial card data:", JSON.stringify({
    id: card.id,
    title: card.title,
    boardId: card.boardId,
    listId: card.listId,
    assignees: card.assignees
  }, null, 2));

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [assignees, setAssignees] = useState<string[]>(card.assignees || []);
  const [dueDate, setDueDate] = useState(
    card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 16) : ''
  );
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  // State for user info
  const [commentUsers, setCommentUsers] = useState<{[key: string]: {name: string, email: string} | null}>({});
  
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(true);
  
  // Load board data to check permissions
  useEffect(() => {
    let isMounted = true;
    const loadBoardData = async () => {
      if (!card.boardId || !user) return;
      
      try {
        console.log("CardModal - Loading board data for boardId:", card.boardId);
        const boardData = await getBoardById(card.boardId, user.id);
        
        if (boardData && isMounted) {
          console.log("CardModal - Board data loaded for permissions check");
          setBoard(boardData);
        }
      } catch (error) {
        console.error('CardModal - Error loading board data:', error);
      }
    };
    
    loadBoardData();
    
    return () => {
      isMounted = false;
    };
  }, [card.boardId, user]);

  useEffect(() => {
    let isMounted = true;
    const loadComments = async () => {
      setCommentsLoading(true);
      setCommentsError(null);
      
      try {
        console.log("CardModal - Loading comments for card:", card.id);
        const cardComments = await getComments(card.id);
        
        if (isMounted) {
          console.log("CardModal - Comments loaded:", cardComments.length);
          setComments(cardComments);
        
          // Load user info for comments
          const uniqueUserIds = [...new Set(cardComments.map(comment => comment.userId))];
          console.log("CardModal - Loading user profiles for:", uniqueUserIds);
          
          const userProfiles = await Promise.all(
            uniqueUserIds.map(async (userId) => {
              try {
                const profile = await getUserProfile(userId);
                return { userId, profile: profile ? { name: profile.name, email: profile.email } : null };
              } catch (error) {
                console.error(`CardModal - Error loading user ${userId}:`, error);
                return { userId, profile: null };
              }
            })
          );
          
          const usersMap = userProfiles.reduce((map, { userId, profile }) => {
            map[userId] = profile;
            return map;
          }, {} as {[key: string]: {name: string, email: string} | null});
          
          console.log("CardModal - User profiles loaded:", Object.keys(usersMap).length);
          if (isMounted) setCommentUsers(usersMap);
        }
      } catch (error) {
        console.error('CardModal - Error loading comments:', error);
        if (isMounted) {
          setComments([]);
          setCommentsError("Failed to load comments. Please try again.");
        }
      } finally {
        if (isMounted) setCommentsLoading(false);
      }
    };
    
    loadComments();
    
    return () => {
      isMounted = false;
    };
  }, [card.id]);

  const handleSave = async () => {
    if (!title.trim() || !permissions.canEdit) return;

    setLoading(true);
    try {
      console.log("CardModal - Saving card with assignees:", assignees);
      
      const updates: Partial<Card> = {
        title: title.trim(),
        description: description.trim(),
        assignees: assignees,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        updatedAt: new Date()
      };

      console.log("CardModal - Updates to save:", updates);
      
      await updateCard(card.id, updates);
      console.log("CardModal - Card updated in Firestore, fetching fresh data");
      
      const updatedCard = await getCardById(card.id);
      
      if (updatedCard) {
        console.log("CardModal - Updated card data from Firestore:", JSON.stringify({
          id: updatedCard.id,
          title: updatedCard.title,
          boardId: updatedCard.boardId,
          listId: updatedCard.listId,
          assignees: updatedCard.assignees
        }, null, 2));
        
        onUpdate(updatedCard);
      } else {
        console.error("CardModal - Failed to retrieve updated card");
      }
    } catch (error) {
      console.error('Error updating card:', error);
      alert('Failed to update card. Please try again.');
    }
    setLoading(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !permissions.canEdit) return;

    const commentData: Omit<Comment, 'id'> = {
      cardId: card.id,
      userId: user.id,
      content: newComment.trim(),
      createdAt: new Date()
    };

    try {
      const commentId = await createComment(commentData);
      const newCommentWithId = { ...commentData, id: commentId };
      setComments(prev => [...prev, newCommentWithId]);
      setNewComment('');
    } catch (error) {
      console.error('Error creating comment:', error);
      alert('Failed to add comment. Please try again.');
    }
  };

  const isOverdue = card.dueDate && new Date() > new Date(card.dueDate);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto neon-scrollbar">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Card Details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 glass-scrollbar">
          {/* Title */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title
              </label>
              {!permissions.canEdit && (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 flex items-center">
                  <Eye className="h-3 w-3 mr-1" /> View only
                </span>
              )}
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => permissions.canEdit && setTitle(e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${!permissions.canEdit ? 'cursor-not-allowed opacity-80' : ''}`}
              placeholder="Enter card title..."
              readOnly={!permissions.canEdit}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => permissions.canEdit && setDescription(e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none ${!permissions.canEdit ? 'cursor-not-allowed opacity-80' : ''}`}
              placeholder="Add a more detailed description..."
              readOnly={!permissions.canEdit}
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Due Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => permissions.canEdit && setDueDate(e.target.value)}
                className={`w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${!permissions.canEdit ? 'cursor-not-allowed opacity-80' : ''}`}
                readOnly={!permissions.canEdit}
              />
            </div>
            {card.dueDate && (
              <div className={`mt-2 flex items-center space-x-2 text-sm ${
                isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
              }`}>
                <Clock className="h-4 w-4" />
                <span>
                  {isOverdue ? 'Overdue since' : 'Due'}: {formatDateTime(new Date(card.dueDate))}
                </span>
              </div>
            )}
          </div>
          
          {/* Assignees */}
          <div>
            <CardAssignees 
              boardId={card.boardId} 
              assignees={card.assignees}
              canEdit={permissions.canEdit}
              onUpdate={(newAssignees) => {
                setAssignees(newAssignees);
              }}
            />
          </div>

          {/* Card Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Card Information</h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div>Created: {formatDateTime(new Date(card.createdAt))}</div>
              <div>Last updated: {formatDateTime(new Date(card.updatedAt))}</div>
              <div>Comments: {comments.length}</div>
            </div>
          </div>

          {/* Comments Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <MessageCircle className="h-5 w-5 mr-2" />
              Comments ({comments.length})
            </h3>

            {/* Add Comment */}
            {permissions.canEdit ? (
              <form onSubmit={handleAddComment} className="mb-4">
                <div className="flex space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user?.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        type="submit"
                        disabled={!newComment.trim()}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                      >
                        Comment
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center">
                <Eye className="h-4 w-4 mr-2" /> View-only mode: Comments are read-only
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-4 max-h-64 overflow-y-auto premium-scrollbar">
              {comments.map((comment) => {
                const commentUser = commentUsers[comment.userId];
                return (
                  <div key={comment.id} className="flex space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {commentUser?.name.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {commentUser?.name || 'Unknown User'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDateTime(new Date(comment.createdAt))}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                );
              })}
              {comments.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No comments yet. Be the first to comment!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            {permissions.canEdit ? 'Cancel' : 'Close'}
          </button>
          {permissions.canEdit && (
            <button
              onClick={handleSave}
              disabled={loading || !title.trim()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardModal;