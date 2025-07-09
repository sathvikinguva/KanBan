export interface User {
  id: string;
  email: string;
  name: string;
  theme: 'light' | 'dark';
  createdAt: Date;
}

export interface Board {
  id: string;
  title: string;
  ownerId: string;
  members: BoardMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardMember {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
  status?: 'pending' | 'accepted' | 'rejected'; // Optional for backward compatibility with older data
  invitedBy?: string; // User ID of the person who sent the invitation
  invitedAt?: Date; // When the invitation was sent
}

export interface List {
  id: string;
  boardId: string;
  title: string;
  order: number;
  createdAt: Date;
}

export interface Card {
  id: string;
  listId: string;
  boardId: string;  // Add boardId to track which board the card belongs to
  title: string;
  description: string;
  assignees: string[];
  dueDate?: Date;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  cardId: string;
  userId: string;
  content: string;
  createdAt: Date;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loading: boolean;
  resendVerification: () => Promise<void>;
}

export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// Role permissions
export interface RolePermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canManageMembers: boolean;
}

export const rolePermissions: Record<'owner' | 'editor' | 'viewer', RolePermissions> = {
  owner: {
    canView: true,
    canEdit: true,
    canDelete: true,
    canInvite: true,
    canManageMembers: true
  },
  editor: {
    canView: true,
    canEdit: true,
    canDelete: false,
    canInvite: false,
    canManageMembers: false
  },
  viewer: {
    canView: true,
    canEdit: false,
    canDelete: false,
    canInvite: false,
    canManageMembers: false
  }
};

// Helper function to get permissions based on role
export const getPermissions = (role?: 'owner' | 'editor' | 'viewer'): RolePermissions => {
  if (!role) return rolePermissions.viewer;
  return rolePermissions[role];
};