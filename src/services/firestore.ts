import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Board, List, Card, Comment } from '../types';

// Helper function to convert Firestore timestamps to Date objects
const convertFirestoreData = (data: any) => {
  const converted = { ...data };
  Object.keys(converted).forEach(key => {
    if (converted[key] && typeof converted[key] === 'object' && converted[key].toDate) {
      converted[key] = converted[key].toDate();
    }
  });
  return converted;
};

// Board operations
export const getBoards = async (userId: string): Promise<Board[]> => {
  try {
    console.log("Firestore - Getting boards for userId:", userId);
    const boardsRef = collection(db, 'boards');
    
    // For now, we need to get all boards and filter client-side 
    // In production, you should use a proper data structure for better querying
    const allBoardsQuery = query(boardsRef);
    const querySnapshot = await getDocs(allBoardsQuery);
    
    const boards: Board[] = [];
    querySnapshot.forEach((doc) => {
      try {
        const boardData = doc.data();
        
        // Check if members array exists
        if (!boardData.members || !Array.isArray(boardData.members)) {
          console.warn(`Firestore - Board ${doc.id} has invalid members data:`, boardData.members);
          return; // Skip this board
        }
        
        // Convert timestamps and create board object
        const boardWithId = { id: doc.id, ...convertFirestoreData(boardData) } as Board;
        
        // Ensure all members have the required fields
        boardWithId.members = boardWithId.members.map(member => {
          if (!member.joinedAt) {
            member.joinedAt = new Date();
          }
          return member;
        });
        
        // Check if the user is a member (any role) of this board
        const isMember = boardWithId.members.some(member => member.userId === userId);
        
        if (isMember) {
          console.log(`Firestore - User ${userId} is a member of board ${doc.id} "${boardWithId.title}"`);
          boards.push(boardWithId);
        }
      } catch (err) {
        console.error(`Firestore - Error processing board ${doc.id}:`, err);
      }
    });
    
    console.log(`Firestore - Found ${boards.length} boards for user ${userId}`);
    return boards;
  } catch (error) {
    console.error('Error getting boards:', error);
    return [];
  }
};

export const createBoard = async (board: Omit<Board, 'id'>): Promise<string> => {
  try {
    const boardData = {
      ...board,
      createdAt: Timestamp.fromDate(board.createdAt),
      updatedAt: Timestamp.fromDate(board.updatedAt)
    };
    const docRef = await addDoc(collection(db, 'boards'), boardData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating board:', error);
    throw new Error('Failed to create board');
  }
};

export const updateBoard = async (boardId: string, updates: Partial<Board>): Promise<void> => {
  try {
    const boardRef = doc(db, 'boards', boardId);
    const updateData = { 
      ...updates, 
      updatedAt: Timestamp.fromDate(new Date()) 
    };
    await updateDoc(boardRef, updateData);
  } catch (error) {
    console.error('Error updating board:', error);
    throw new Error('Failed to update board');
  }
};

export const getBoardById = async (boardId: string, userId?: string): Promise<Board | null> => {
  try {
    console.log(`Firestore - Getting board ${boardId}${userId ? ` for user ${userId}` : ''}`);
    const boardRef = doc(db, 'boards', boardId);
    const boardSnap = await getDoc(boardRef);
    
    if (boardSnap.exists()) {
      const board = { id: boardSnap.id, ...convertFirestoreData(boardSnap.data()) } as Board;
      
      // If userId is provided, verify user has access to this board
      if (userId) {
        const isMember = board.members.some(member => member.userId === userId);
        if (!isMember) {
          console.warn(`Firestore - User ${userId} does not have access to board ${boardId}`);
          return null; // User doesn't have access
        }
      }
      
      return board;
    }
    
    console.log(`Firestore - Board ${boardId} not found`);
    return null;
  } catch (error) {
    console.error('Error getting board:', error);
    return null;
  }
};

export const deleteBoard = async (boardId: string): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Delete board
    const boardRef = doc(db, 'boards', boardId);
    batch.delete(boardRef);
    
    // Delete all lists in the board
    const listsQuery = query(collection(db, 'lists'), where('boardId', '==', boardId));
    const listsSnapshot = await getDocs(listsQuery);
    
    const listIds: string[] = [];
    listsSnapshot.forEach((doc) => {
      listIds.push(doc.id);
      batch.delete(doc.ref);
    });
    
    // Delete all cards in the lists
    if (listIds.length > 0) {
      const cardsQuery = query(collection(db, 'cards'), where('listId', 'in', listIds));
      const cardsSnapshot = await getDocs(cardsQuery);
      
      const cardIds: string[] = [];
      cardsSnapshot.forEach((doc) => {
        cardIds.push(doc.id);
        batch.delete(doc.ref);
      });
      
      // Delete all comments for the cards
      if (cardIds.length > 0) {
        const commentsQuery = query(collection(db, 'comments'), where('cardId', 'in', cardIds));
        const commentsSnapshot = await getDocs(commentsQuery);
        
        commentsSnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
      }
    }
    
    await batch.commit();
  } catch (error) {
    console.error('Error deleting board:', error);
    throw new Error('Failed to delete board');
  }
};

// List operations
export const getLists = async (boardId: string): Promise<List[]> => {
  try {
    console.log("Fetching lists for boardId:", boardId);
    const listsRef = collection(db, 'lists');
    
    // First try with order - this requires the composite index
    try {
      const q = query(
        listsRef, 
        where('boardId', '==', boardId),
        orderBy('order', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      const lists: List[] = [];
      querySnapshot.forEach((doc) => {
        const data = convertFirestoreData(doc.data());
        lists.push({ id: doc.id, ...data } as List);
      });
      
      console.log("Successfully fetched lists with order:", lists.length);
      return lists;
    } catch (indexError: any) {
      // If index error, fall back to query without orderBy
      if (indexError.message && indexError.message.includes("index")) {
        console.warn("Index error, falling back to unordered query:", indexError.message);
        
        const fallbackQuery = query(
          listsRef, 
          where('boardId', '==', boardId)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        
        const fallbackLists: List[] = [];
        fallbackSnapshot.forEach((doc) => {
          const data = convertFirestoreData(doc.data());
          fallbackLists.push({ id: doc.id, ...data } as List);
        });
        
        // Sort manually by order
        fallbackLists.sort((a, b) => a.order - b.order);
        
        console.log("Successfully fetched lists without order:", fallbackLists.length);
        
        // Show index creation help
        console.warn(
          "Please create the required Firestore index using this link: " +
          "https://console.firebase.google.com/project/_/firestore/indexes"
        );
        
        return fallbackLists;
      } else {
        // If not an index error, re-throw
        throw indexError;
      }
    }
  } catch (error) {
    console.error('Error getting lists:', error);
    throw error; // Re-throw so the component can handle it
  }
};

export const createList = async (list: Omit<List, 'id'>): Promise<string> => {
  try {
    const listData = {
      ...list,
      createdAt: Timestamp.fromDate(list.createdAt)
    };
    const docRef = await addDoc(collection(db, 'lists'), listData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating list:', error);
    throw new Error('Failed to create list');
  }
};

export const updateList = async (listId: string, updates: Partial<List>): Promise<void> => {
  try {
    const listRef = doc(db, 'lists', listId);
    await updateDoc(listRef, updates);
  } catch (error) {
    console.error('Error updating list:', error);
    throw new Error('Failed to update list');
  }
};

export const deleteList = async (listId: string): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Delete list
    const listRef = doc(db, 'lists', listId);
    batch.delete(listRef);
    
    // Delete all cards in the list
    const cardsQuery = query(collection(db, 'cards'), where('listId', '==', listId));
    const cardsSnapshot = await getDocs(cardsQuery);
    
    const cardIds: string[] = [];
    cardsSnapshot.forEach((doc) => {
      cardIds.push(doc.id);
      batch.delete(doc.ref);
    });
    
    // Delete all comments for the cards
    if (cardIds.length > 0) {
      const commentsQuery = query(collection(db, 'comments'), where('cardId', 'in', cardIds));
      const commentsSnapshot = await getDocs(commentsQuery);
      
      commentsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
    }
    
    await batch.commit();
  } catch (error) {
    console.error('Error deleting list:', error);
    throw new Error('Failed to delete list');
  }
};

// Card operations
export const getCards = async (listId: string): Promise<Card[]> => {
  try {
    const cardsRef = collection(db, 'cards');
    const q = query(
      cardsRef, 
      where('listId', '==', listId),
      orderBy('order', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    const cards: Card[] = [];
    querySnapshot.forEach((doc) => {
      cards.push({ id: doc.id, ...convertFirestoreData(doc.data()) } as Card);
    });
    
    return cards;
  } catch (error) {
    console.error('Error getting cards:', error);
    return [];
  }
};

export const getAllCards = async (boardId: string): Promise<Card[]> => {
  try {
    console.log("Firestore - Getting all cards for board:", boardId);
    
    // First get all lists for the board
    const lists = await getLists(boardId);
    const listIds = lists.map(list => list.id);
    
    console.log("Firestore - Found list IDs:", listIds);
    
    if (listIds.length === 0) {
      console.log("Firestore - No lists found for board, returning empty cards array");
      return [];
    }
    
    const cardsRef = collection(db, 'cards');
    const q = query(cardsRef, where('listId', 'in', listIds));
    const querySnapshot = await getDocs(q);
    
    const cards: Card[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const convertedData = convertFirestoreData(data);
      const card = { id: doc.id, ...convertedData } as Card;
      
      // Ensure all cards have the boardId
      if (!card.boardId) {
        card.boardId = boardId;
      }
      
      // Ensure assignees is always an array
      if (!card.assignees) {
        card.assignees = [];
      }
      
      cards.push(card);
    });
    
    console.log("Firestore - Retrieved cards count:", cards.length);
    
    return cards;
  } catch (error) {
    console.error('Error getting all cards:', error);
    return [];
  }
};

export const createCard = async (card: Omit<Card, 'id'>): Promise<string> => {
  try {
    const cardData = {
      ...card,
      createdAt: Timestamp.fromDate(card.createdAt),
      updatedAt: Timestamp.fromDate(card.updatedAt),
      dueDate: card.dueDate ? Timestamp.fromDate(card.dueDate) : null
    };
    const docRef = await addDoc(collection(db, 'cards'), cardData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating card:', error);
    throw new Error('Failed to create card');
  }
};

export const updateCard = async (cardId: string, updates: Partial<Card>): Promise<void> => {
  try {
    console.log("Firestore - Updating card:", cardId, "with updates:", updates);
    
    const cardRef = doc(db, 'cards', cardId);
    
    // First get the current card data
    const cardDoc = await getDoc(cardRef);
    if (!cardDoc.exists()) {
      throw new Error(`Card with ID ${cardId} not found`);
    }
    
    const updateData: any = { 
      updatedAt: Timestamp.fromDate(new Date())
    };
    
    // Handle each field appropriately
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.listId !== undefined) updateData.listId = updates.listId;
    if (updates.order !== undefined) updateData.order = updates.order;
    
    // Handle date conversion for dueDate
    if (updates.dueDate !== undefined) {
      updateData.dueDate = updates.dueDate ? Timestamp.fromDate(updates.dueDate) : null;
    }
    
    // Always ensure boardId is preserved
    if (updates.boardId !== undefined) {
      updateData.boardId = updates.boardId;
    }
    
    // Explicitly handle assignees as an array
    if (updates.assignees !== undefined) {
      console.log("Firestore - Updating assignees to:", updates.assignees);
      updateData.assignees = updates.assignees || [];
    }
    
    console.log("Firestore - Final update data:", updateData);
    await updateDoc(cardRef, updateData);
    
    console.log("Firestore - Card updated successfully");
  } catch (error) {
    console.error('Error updating card:', error);
    throw new Error('Failed to update card');
  }
};

export const getCardById = async (cardId: string): Promise<Card | null> => {
  try {
    console.log("Firestore - Getting card by ID:", cardId);
    const cardRef = doc(db, 'cards', cardId);
    const cardSnap = await getDoc(cardRef);
    
    if (cardSnap.exists()) {
      const data = cardSnap.data();
      console.log("Firestore - Raw card data:", data);
      
      const convertedData = convertFirestoreData(data);
      console.log("Firestore - Converted card data:", convertedData);
      
      const card = { id: cardSnap.id, ...convertedData } as Card;
      console.log("Firestore - Final card object:", card);
      
      return card;
    }
    console.log("Firestore - Card not found:", cardId);
    return null;
  } catch (error) {
    console.error('Error getting card:', error);
    return null;
  }
};

export const deleteCard = async (cardId: string): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Delete card
    const cardRef = doc(db, 'cards', cardId);
    batch.delete(cardRef);
    
    // Delete all comments for the card
    const commentsQuery = query(collection(db, 'comments'), where('cardId', '==', cardId));
    const commentsSnapshot = await getDocs(commentsQuery);
    
    commentsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error deleting card:', error);
    throw new Error('Failed to delete card');
  }
};

// Comment operations
export const getComments = async (cardId: string): Promise<Comment[]> => {
  try {
    console.log("Fetching comments for cardId:", cardId);
    const commentsRef = collection(db, 'comments');
    
    // First try with order - this requires the composite index
    try {
      const q = query(
        commentsRef, 
        where('cardId', '==', cardId),
        orderBy('createdAt', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      const comments: Comment[] = [];
      querySnapshot.forEach((doc) => {
        const data = convertFirestoreData(doc.data());
        comments.push({ id: doc.id, ...data } as Comment);
      });
      
      console.log("Successfully fetched comments with order:", comments.length);
      return comments;
    } catch (indexError: any) {
      // If index error, fall back to query without orderBy
      if (indexError.message && indexError.message.includes("index")) {
        console.warn("Index error, falling back to unordered query:", indexError.message);
        
        const fallbackQuery = query(
          commentsRef, 
          where('cardId', '==', cardId)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        
        const fallbackComments: Comment[] = [];
        fallbackSnapshot.forEach((doc) => {
          const data = convertFirestoreData(doc.data());
          fallbackComments.push({ id: doc.id, ...data } as Comment);
        });
        
        // Sort manually by createdAt
        fallbackComments.sort((a, b) => 
          a.createdAt.getTime() - b.createdAt.getTime()
        );
        
        console.log("Successfully fetched comments without order:", fallbackComments.length);
        
        // Show index creation help
        console.warn(
          "Please create the required Firestore index using this link: " +
          "https://console.firebase.google.com/project/_/firestore/indexes"
        );
        
        return fallbackComments;
      } else {
        // If not an index error, re-throw
        throw indexError;
      }
    }
  } catch (error) {
    console.error('Error getting comments:', error);
    throw error; // Re-throw so the component can handle it
  }
};

export const createComment = async (comment: Omit<Comment, 'id'>): Promise<string> => {
  try {
    const commentData = {
      ...comment,
      createdAt: Timestamp.fromDate(comment.createdAt)
    };
    const docRef = await addDoc(collection(db, 'comments'), commentData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating comment:', error);
    throw new Error('Failed to create comment');
  }
};

export const respondToBoardInvitation = async (
  boardId: string, 
  userId: string, 
  response: 'accepted' | 'rejected'
): Promise<void> => {
  try {
    console.log(`Firestore - Responding to invitation for board ${boardId} by user ${userId} with ${response}`);
    
    // Validate inputs
    if (!boardId) throw new Error('Board ID is required');
    if (!userId) throw new Error('User ID is required');
    if (!response) throw new Error('Response status is required');
    
    // Get the current board data
    const boardRef = doc(db, 'boards', boardId);
    const boardSnap = await getDoc(boardRef);
    
    if (!boardSnap.exists()) {
      throw new Error(`Board with ID ${boardId} not found`);
    }
    
    const boardData = boardSnap.data();
    
    // Validate board structure
    if (!boardData.members || !Array.isArray(boardData.members)) {
      throw new Error(`Board ${boardId} has invalid or missing members array`);
    }
    
    // Convert the raw Firestore data to our typed Board model
    const board = convertFirestoreData(boardData) as Board;
    console.log(`Firestore - Got board data for ${boardId}, members count:`, board.members.length);
    
    // Find the member entry for this user
    const memberIndex = board.members.findIndex(member => member.userId === userId);
    
    if (memberIndex === -1) {
      throw new Error(`User ${userId} is not a member of board ${boardId}`);
    }
    
    console.log(`Firestore - Found user ${userId} at index ${memberIndex} in members array`);
    
    // Create a new members array with the updated status
    const updatedMembers = [...board.members];
    const currentDate = new Date();
    
    // Update member status and dates
    updatedMembers[memberIndex] = {
      ...updatedMembers[memberIndex],
      status: response,
      joinedAt: response === 'accepted' ? currentDate : updatedMembers[memberIndex].joinedAt
    };
    
    // Prepare the data for Firestore update - handle date conversions safely
    const membersForFirestore = updatedMembers.map(member => {
      // Create a plain object without the type constraints
      const plainMember: any = { ...member };
      
      try {
        // Safely handle joinedAt
        if (plainMember.joinedAt instanceof Date) {
          plainMember.joinedAt = Timestamp.fromDate(plainMember.joinedAt);
        } else {
          // If not a Date, use current time
          plainMember.joinedAt = Timestamp.fromDate(new Date());
        }
        
        // Safely handle invitedAt if it exists
        if (plainMember.invitedAt) {
          if (plainMember.invitedAt instanceof Date) {
            plainMember.invitedAt = Timestamp.fromDate(plainMember.invitedAt);
          } else {
            delete plainMember.invitedAt; // Remove invalid date
          }
        }
      } catch (err) {
        console.error("Error converting dates for member:", member.userId, err);
        // Fallback to current date for required fields
        plainMember.joinedAt = Timestamp.fromDate(new Date());
        delete plainMember.invitedAt;
      }
      
      return plainMember;
    });
    
    // Update the board with the new members array
    await updateDoc(boardRef, {
      members: membersForFirestore,
      updatedAt: Timestamp.fromDate(new Date())
    });
    
    console.log(`Firestore - Successfully updated invitation status to ${response}`);
  } catch (error) {
    console.error('Error responding to board invitation:', error);
    // Include more detailed error info
    let errorMessage = 'Failed to respond to board invitation';
    
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
};
