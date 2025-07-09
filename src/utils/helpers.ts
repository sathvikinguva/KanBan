export const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(dateObj);
  } catch (error) {
    return 'Invalid Date';
  }
};

export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  } catch (error) {
    return 'Invalid Date';
  }
};

export const isOverdue = (dueDate: Date | string | null | undefined): boolean => {
  if (!dueDate) return false;
  
  try {
    const dateObj = dueDate instanceof Date ? dueDate : new Date(dueDate);
    if (isNaN(dateObj.getTime())) {
      return false;
    }
    return new Date() > dateObj;
  } catch (error) {
    return false;
  }
};

export const searchCards = (cards: any[], query: string): any[] => {
  if (!query.trim()) return cards;
  
  const lowerQuery = query.toLowerCase();
  return cards.filter(card => 
    card.title.toLowerCase().includes(lowerQuery) ||
    card.description.toLowerCase().includes(lowerQuery)
  );
};

import { getUserProfile } from '../services/auth';

export const getUserById = async (userId: string): Promise<{ name: string; email: string } | null> => {
  try {
    const userProfile = await getUserProfile(userId);
    return userProfile ? { name: userProfile.name, email: userProfile.email } : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};