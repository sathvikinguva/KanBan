import React, { useState, useEffect } from 'react';
import { X, Mail, UserPlus, Users, Crown, Edit, Eye, Trash2 } from 'lucide-react';
import { Board, BoardMember } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { updateBoard } from '../utils/storage';
import { getUserProfile, getUserByEmail } from '../services/auth';

interface InviteModalProps {
  board: Board;
  onClose: () => void;
  onUpdate: (board: Board) => void;
}

const InviteModal: React.FC<InviteModalProps> = ({ board, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [memberUsers, setMemberUsers] = useState<{[key: string]: {name: string, email: string} | null}>({});

  useEffect(() => {
    const loadMemberData = async () => {
      // Get unique member IDs
      const memberIds = board.members.map(member => member.userId);
      
      // Load user profiles in parallel
      const userProfiles = await Promise.all(
        memberIds.map(async (userId) => {
          try {
            const profile = await getUserProfile(userId);
            return { 
              userId, 
              profile: profile ? { name: profile.name, email: profile.email } : null 
            };
          } catch (error) {
            console.error(`Error loading user ${userId}:`, error);
            return { userId, profile: null };
          }
        })
      );
      
      // Convert to lookup object
      const usersMap = userProfiles.reduce((map, { userId, profile }) => {
        map[userId] = profile;
        return map;
      }, {} as {[key: string]: {name: string, email: string} | null});
      
      setMemberUsers(usersMap);
    };
    
    loadMemberData();
  }, [board.members]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    try {
      console.log("InviteModal - Looking up user by email:", email.trim());
      
      // Look up user by email in Firestore
      const invitedUserProfile = await getUserByEmail(email.trim());
      
      // If user doesn't exist in our system, show error
      if (!invitedUserProfile) {
        console.warn("InviteModal - No user found with email:", email.trim());
        setError('No user found with this email address. They need to sign up first.');
        setLoading(false);
        return;
      }
      
      console.log("InviteModal - Found user:", invitedUserProfile);
      
      // Use the Firestore user data
      const invitedUser = {
        id: invitedUserProfile.id,
        email: invitedUserProfile.email,
        name: invitedUserProfile.name
      };

      // Check if user is already a member
      const existingMember = board.members.find(m => m.userId === invitedUser.id);
      if (existingMember) {
        setError('User is already a member of this board');
        setLoading(false);
        return;
      }

      // Add member to board with pending status
      const newMember: BoardMember = {
        userId: invitedUser.id,
        role,
        joinedAt: new Date(),
        status: 'pending', // Set status to pending
        invitedBy: user?.id || '',
        invitedAt: new Date()
      };

      const updatedBoard = {
        ...board,
        members: [...board.members, newMember],
        updatedAt: new Date()
      };

      updateBoard(board.id, { members: updatedBoard.members, updatedAt: updatedBoard.updatedAt });
      onUpdate(updatedBoard);
      setEmail('');
      setError('');
    } catch (err) {
      setError('Failed to invite user');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    if (memberId === board.ownerId) return; // Can't remove owner

    const updatedMembers = board.members.filter(m => m.userId !== memberId);
    const updatedBoard = {
      ...board,
      members: updatedMembers,
      updatedAt: new Date()
    };

    updateBoard(board.id, { members: updatedMembers, updatedAt: updatedBoard.updatedAt });
    onUpdate(updatedBoard);
  };

  const handleRoleChange = (memberId: string, newRole: 'owner' | 'editor' | 'viewer') => {
    if (memberId === board.ownerId && newRole !== 'owner') return; // Can't change owner role

    const updatedMembers = board.members.map(m => 
      m.userId === memberId ? { ...m, role: newRole } : m
    );
    const updatedBoard = {
      ...board,
      members: updatedMembers,
      updatedAt: new Date()
    };

    updateBoard(board.id, { members: updatedMembers, updatedAt: updatedBoard.updatedAt });
    onUpdate(updatedBoard);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'editor': return <Edit className="h-4 w-4 text-blue-500" />;
      case 'viewer': return <Eye className="h-4 w-4 text-gray-500" />;
      default: return <Eye className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400';
      case 'editor': return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400';
      case 'viewer': return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400';
    }
  };

  const currentUserRole = board.members.find(m => m.userId === user?.id)?.role;
  const canInvite = currentUserRole === 'owner'; // Only owners can invite

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Board Members
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Invite Section */}
          {currentUserRole === 'editor' && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-400 flex items-center">
                <Crown className="h-4 w-4 mr-2" /> 
                Only board owners can invite new members
              </p>
            </div>
          )}
          
          {canInvite && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <UserPlus className="h-5 w-5 mr-2" />
                Invite Member
              </h3>
              
              <form onSubmit={handleInviteUser} className="space-y-4">
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="editor">Editor - Can edit cards and lists</option>
                    <option value="viewer">Viewer - Can only view the board</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!email.trim() || loading}
                  className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Inviting...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Members List */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Members ({board.members.length})
            </h3>

            <div className="space-y-3">
              {board.members.map((member) => {
                const memberUser = memberUsers[member.userId];
                const isOwner = member.userId === board.ownerId;
                const canModify = (currentUserRole === 'owner' && !isOwner) || 
                                 (currentUserRole === 'editor' && member.role === 'viewer');

                return (
                  <div key={member.userId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {memberUser?.name ? memberUser.name.charAt(0).toUpperCase() : 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {memberUser?.name || (member.userId === user?.id ? user.name : 'Unknown User')}
                          {member.userId === user?.id && ' (You)'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {memberUser?.email || (member.userId === user?.id ? user.email : 'Unknown Email')}
                        </p>
                        {member.status === 'pending' && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 px-1.5 py-0.5 rounded">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {canModify ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.userId, e.target.value as any)}
                          className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                          {getRoleIcon(member.role)}
                          <span className="ml-1 capitalize">{member.role}</span>
                        </span>
                      )}

                      {canModify && (
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Permissions Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
              Permission Levels
            </h4>
            <div className="space-y-1 text-xs text-blue-800 dark:text-blue-400">
              <div className="flex items-center space-x-2">
                <Crown className="h-3 w-3 text-yellow-500" />
                <span><strong>Owner:</strong> Full access, can invite members and delete board</span>
              </div>
              <div className="flex items-center space-x-2">
                <Edit className="h-3 w-3 text-blue-500" />
                <span><strong>Editor:</strong> Can create/edit cards and lists, but cannot invite members</span>
              </div>
              <div className="flex items-center space-x-2">
                <Eye className="h-3 w-3 text-gray-500" />
                <span><strong>Viewer:</strong> Can only view the board, no editing capabilities</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;