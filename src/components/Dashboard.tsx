import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, Calendar, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Board } from '../types';
import { getBoards, createBoard } from '../utils/storage';
import { formatDate } from '../utils/helpers';
import Navbar from './Navbar';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');

  const [pendingInvitations, setPendingInvitations] = useState<Board[]>([]);
  const [acceptedBoards, setAcceptedBoards] = useState<Board[]>([]);
  const [isProcessingInvitation, setIsProcessingInvitation] = useState(false);

  useEffect(() => {
    const loadBoards = async () => {
      if (user) {
        try {
          console.log("Dashboard - Loading boards for user:", user.id);
          const userBoards = await getBoards(user.id);
          console.log(`Dashboard - Found ${userBoards.length} boards for user ${user.id}`);
          console.log("Dashboard - Boards data:", userBoards);
          
          // Separate boards into pending invitations and accepted boards
          const pending: Board[] = [];
          const accepted: Board[] = [];
          
          userBoards.forEach(board => {
            const memberRecord = board.members.find(member => member.userId === user.id);
            const memberStatus = memberRecord?.status;
            
            console.log(`Dashboard - Board ${board.id} "${board.title}" - Member status for current user:`, 
              memberStatus, "Member record:", memberRecord);
            
            if (memberStatus === 'pending') {
              console.log(`Dashboard - Adding board ${board.id} to pending invitations`);
              pending.push(board);
            } else if (memberStatus === undefined || memberStatus === 'accepted') {
              // Include boards where status is not defined (for backward compatibility)
              console.log(`Dashboard - Adding board ${board.id} to accepted boards`);
              accepted.push(board);
            } else {
              console.log(`Dashboard - Skipping board ${board.id} with status:`, memberStatus);
            }
          });
          
          console.log(`Dashboard - Found ${pending.length} pending invitations`);
          console.log(`Dashboard - Found ${accepted.length} accepted boards`);
          
          setPendingInvitations(pending);
          setAcceptedBoards(accepted);
          setBoards(userBoards);
          
        } catch (error) {
          console.error('Error loading boards:', error);
          setPendingInvitations([]);
          setAcceptedBoards([]);
          setBoards([]);
        }
      } else {
        console.log("Dashboard - No user logged in");
        setPendingInvitations([]);
        setAcceptedBoards([]);
        setBoards([]);
      }
    };
    
    loadBoards();
  }, [user]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newBoardTitle.trim()) return;

    const newBoardData: Omit<Board, 'id'> = {
      title: newBoardTitle.trim(),
      ownerId: user.id,
      members: [{ userId: user.id, role: 'owner', joinedAt: new Date() }],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const boardId = await createBoard(newBoardData);
      const newBoard = { ...newBoardData, id: boardId };
      setBoards(prev => [newBoard, ...prev]);
      setNewBoardTitle('');
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating board:', error);
      alert('Failed to create board. Please try again.');
    }
  };

  const handleRespondToInvitation = async (boardId: string, response: 'accepted' | 'rejected') => {
    if (!user) return;
    
    setIsProcessingInvitation(true);
    try {
      console.log(`Dashboard - Responding to invitation for board ${boardId} with response: ${response}`);
      
      // Import directly to avoid circular dependencies
      const { respondToBoardInvitation } = await import('../utils/storage');
      
      await respondToBoardInvitation(boardId, user.id, response);
      console.log(`Dashboard - Successfully responded to invitation for board ${boardId}`);
      
      // Update local state to reflect the change
      setPendingInvitations(prev => prev.filter(board => board.id !== boardId));
      
      if (response === 'accepted') {
        // Find the board in the original boards array
        const acceptedBoard = boards.find(board => board.id === boardId);
        if (acceptedBoard) {
          // Update the status in the board object
          const updatedBoard: Board = {
            ...acceptedBoard,
            members: acceptedBoard.members.map(member => 
              member.userId === user.id 
                ? { ...member, status: 'accepted' as const } 
                : member
            )
          };
          setAcceptedBoards(prev => [...prev, updatedBoard]);
        }
      }
      
      // Reload all boards to get the updated data
      console.log(`Dashboard - Reloading boards after invitation response`);
      const updatedBoards = await getBoards(user.id);
      setBoards(updatedBoards);
      
    } catch (error) {
      console.error('Error responding to invitation:', error);
      
      // Show a more helpful error message
      let errorMessage = 'Failed to respond to invitation.';
      if (error instanceof Error) {
        errorMessage += ` Error: ${error.message}`;
      }
      alert(errorMessage);
    } finally {
      setIsProcessingInvitation(false);
    }
  };

  // Filter the boards based on search query
  const filteredBoards = acceptedBoards.filter(board =>
    board.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              My Boards
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Organize your projects and collaborate with your team
            </p>
            <div className="mt-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <span className="font-medium">Note:</span> You can only see boards you've created or been invited to.
                To collaborate on others' boards, ask them to invite you using the "Invite" button.
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Board
          </button>
        </div>

        {pendingInvitations.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <UserPlus className="h-5 w-5 mr-2 text-blue-500" />
              Pending Invitations
            </h2>
            
            <div className="space-y-4">
              {pendingInvitations.map(board => {
                return (
                  <div 
                    key={board.id} 
                    className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-blue-800 dark:text-blue-300">
                          {board.title}
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                          You've been invited to join this board by the owner
                        </p>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRespondToInvitation(board.id, 'rejected')}
                          disabled={isProcessingInvitation}
                          className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md disabled:opacity-50"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleRespondToInvitation(board.id, 'accepted')}
                          disabled={isProcessingInvitation}
                          className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search boards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {acceptedBoards.length > 0 && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              My Boards
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredBoards.map((board) => (
                <div
                  key={board.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                  onClick={() => window.location.href = `/board/${board.id}`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {board.title}
                      </h3>
                    </div>
                    
                    <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Users className="h-4 w-4 mr-1" />
                      <span>{board.members.length} member{board.members.length !== 1 ? 's' : ''}</span>
                    </div>
                    
                    <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Created {formatDate(new Date(board.createdAt))}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {filteredBoards.length === 0 && acceptedBoards.length === 0 && pendingInvitations.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Search className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No boards match your search' : 'No boards yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery 
                ? 'Try adjusting your search terms' 
                : 'Create your first board or ask someone to invite you to their board'
              }
            </p>
            {!searchQuery && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
                You'll only see boards you've created or been invited to join
              </p>
            )}
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Board
              </button>
            )}
          </div>
        )}
        
        {filteredBoards.length === 0 && acceptedBoards.length > 0 && searchQuery && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Search className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No boards match your search
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Try adjusting your search terms
            </p>
          </div>
        )}
      </div>

      {/* Create Board Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Create New Board
            </h2>
            
            <form onSubmit={handleCreateBoard}>
              <div className="mb-4">
                <label htmlFor="boardTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Board Title
                </label>
                <input
                  id="boardTitle"
                  type="text"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  placeholder="Enter board title..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  autoFocus
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewBoardTitle('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newBoardTitle.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;