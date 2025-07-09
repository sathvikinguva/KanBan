import { Board, List, Card, Comment } from '../types';
import * as firestoreService from '../services/firestore';

// Re-export all Firestore functions to maintain compatibility
export const getBoards = firestoreService.getBoards;
export const createBoard = async (board: Omit<Board, 'id'>): Promise<string> => {
  return firestoreService.createBoard(board);
};
export const updateBoard = firestoreService.updateBoard;
export const getBoardById = firestoreService.getBoardById;
export const deleteBoard = firestoreService.deleteBoard;

export const getLists = firestoreService.getLists;
export const createList = async (list: Omit<List, 'id'>): Promise<string> => {
  return firestoreService.createList(list);
};
export const updateList = firestoreService.updateList;
export const deleteList = firestoreService.deleteList;

export const getCards = firestoreService.getCards;
export const getAllCards = firestoreService.getAllCards;
export const createCard = async (card: Omit<Card, 'id'>): Promise<string> => {
  return firestoreService.createCard(card);
};
export const updateCard = firestoreService.updateCard;
export const getCardById = firestoreService.getCardById;
export const deleteCard = firestoreService.deleteCard;

export const getComments = firestoreService.getComments;
export const createComment = async (comment: Omit<Comment, 'id'>): Promise<string> => {
  return firestoreService.createComment(comment);
};
export const respondToBoardInvitation = firestoreService.respondToBoardInvitation;