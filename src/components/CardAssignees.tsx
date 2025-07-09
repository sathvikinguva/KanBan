import React, { useState, useEffect } from 'react';
import { UserPlus, X } from 'lucide-react';
import { getUserProfile } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';

interface CardAssigneesProps {
  boardId: string;
  assignees: string[];
  canEdit?: boolean;
  onUpdate: (assignees: string[]) => void;
}

const CardAssignees: React.FC<CardAssigneesProps> = ({ boardId, assignees, canEdit = true, onUpdate }) => {
  const { user } = useAuth();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [boardMembers, setBoardMembers] = useState<{id: string, name: string, email: string}[]>([]);
  const [assigneeUsers, setAssigneeUsers] = useState<{[key: string]: {name: string, email: string} | null}>({});
  const [loading, setLoading] = useState(true);
  
  // Load board members directly from Firestore
  useEffect(() => {
    let isMounted = true;
    const loadBoardData = async () => {
      try {
        console.log("CardAssignees - Loading board data for boardId:", boardId);
        
        // Use direct import of firestore service to avoid circular dependencies
        const { getBoardById } = await import('../services/firestore');
        const boardData = await getBoardById(boardId, user?.id);
        
        if (!boardData) {
          console.warn("CardAssignees - Board not found:", boardId);
          if (isMounted) setLoading(false);
          return;
        }
        
        console.log("CardAssignees - Board data loaded:", boardData);
        console.log("CardAssignees - Board members:", boardData.members);
        
        // Load user profiles for all members
        const memberIds = boardData.members.map(member => member.userId);
        const userProfiles = await Promise.all(
          memberIds.map(async (userId) => {
            try {
              console.log("CardAssignees - Loading user profile for:", userId);
              const profile = await getUserProfile(userId);
              return profile ? { 
                id: userId, 
                name: profile.name || 'Unknown User', 
                email: profile.email || 'No email'
              } : null;
            } catch (error) {
              console.error(`Error loading user ${userId}:`, error);
              return null;
            }
          })
        );
        
        const validProfiles = userProfiles.filter(Boolean) as {id: string, name: string, email: string}[];
        console.log("CardAssignees - Valid profiles loaded:", validProfiles);
        
        if (isMounted) setBoardMembers(validProfiles);
      } catch (error) {
        console.error('CardAssignees - Error loading board members:', error);
      }
      
      if (isMounted) setLoading(false);
    };
    
    if (boardId) {
      loadBoardData();
    } else {
      console.warn("CardAssignees - No boardId provided");
      setLoading(false);
    }
    
    return () => {
      isMounted = false;
    };
  }, [boardId, user]);
  
  // Load assignee user data
  useEffect(() => {
    let isMounted = true;
    const loadAssigneeData = async () => {
      if (assignees.length === 0) {
        if (isMounted) setAssigneeUsers({});
        return;
      }
      
      try {
        console.log("CardAssignees - Loading assignee data for:", assignees);
        
        const userProfiles = await Promise.all(
          assignees.map(async (userId) => {
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
        
        const usersMap = userProfiles.reduce((map, { userId, profile }) => {
          map[userId] = profile;
          return map;
        }, {} as {[key: string]: {name: string, email: string} | null});
        
        console.log("CardAssignees - Assignee users loaded:", usersMap);
        
        if (isMounted) setAssigneeUsers(usersMap);
      } catch (error) {
        console.error('Error loading assignees:', error);
      }
    };
    
    loadAssigneeData();
    
    return () => {
      isMounted = false;
    };
  }, [assignees]);
  
  const toggleAssignee = (userId: string) => {
    const newAssignees = assignees.includes(userId)
      ? assignees.filter(id => id !== userId)
      : [...assignees, userId];
    
    onUpdate(newAssignees);
    setShowAddMenu(false);
  };
  
  const unassignableUserIds = assignees;
  const assignableUsers = boardMembers.filter(member => !unassignableUserIds.includes(member.id));

  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Assignees
        </label>
        
        {assignees.length === 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            No assignees yet
          </span>
        )}
        
        {assignees.map(userId => {
          const assignee = assigneeUsers[userId];
          return (
            <div 
              key={userId} 
              className="flex items-center space-x-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs"
            >
              <div className="w-4 h-4 bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {assignee?.name && assignee.name.trim() ? assignee.name.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <span>{assignee?.name && assignee.name.trim() ? assignee.name : 'Unknown User'}</span>
              {canEdit && (
                <button
                  onClick={() => toggleAssignee(userId)}
                  className="ml-1 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
        
        {canEdit && (
          <button 
            onClick={() => setShowAddMenu(prev => !prev)}
            className="inline-flex items-center px-2 py-1 text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Assign
          </button>
        )}
      </div>
      
      {showAddMenu && (
        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 premium-scrollbar">
          {loading ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Loading members...
            </div>
          ) : assignableUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No more members to assign
            </div>
          ) : (
            <div className="py-1">
              {assignableUsers.map(member => (
                <button
                  key={member.id}
                  onClick={() => toggleAssignee(member.id)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                >
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {member.name && member.name.trim() ? member.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                  <span>{member.name && member.name.trim() ? member.name : 'Unknown User'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CardAssignees;
