import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Board, getPermissions, RolePermissions } from '../types';

// This hook provides permission information for the current user on a board
export const usePermissions = (board?: Board | null): RolePermissions => {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user || !board) {
      // If no user or no board, return view-only permissions
      return getPermissions('viewer');
    }

    // Find the user's role on this board
    const memberRecord = board.members.find(member => member.userId === user.id);
    
    // If user is not a member or the status is not accepted, they have view-only permissions
    if (!memberRecord || (memberRecord.status !== undefined && memberRecord.status !== 'accepted')) {
      return getPermissions('viewer');
    }
    
    // Use the user's assigned role
    return getPermissions(memberRecord.role);
  }, [user, board]);
};

export default usePermissions;
