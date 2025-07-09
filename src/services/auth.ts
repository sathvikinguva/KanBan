import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendEmailVerification, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  emailVerified: boolean;
}

// Sign up with email verification
export const signUp = async (email: string, password: string, name: string): Promise<void> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Send email verification
    await sendEmailVerification(user);
    
    // Create user profile in Firestore
    const userProfile: UserProfile = {
      id: user.uid,
      email: user.email!,
      name: name,
      createdAt: new Date(),
      emailVerified: false
    };
    
    await setDoc(doc(db, 'users', user.uid), userProfile);
    
    // Sign out user until email is verified
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Sign in
export const signIn = async (email: string, password: string): Promise<void> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    if (!user.emailVerified) {
      await signOut(auth);
      throw new Error('Please verify your email before signing in. Check your inbox for the verification link.');
    }
    
    // Update email verification status in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      emailVerified: true
    }, { merge: true });
    
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get user profile from Firestore
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    console.log("Auth Service - Getting user profile for:", uid);
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const userData = docSnap.data() as UserProfile;
      console.log("Auth Service - User profile found:", userData);
      
      // Ensure all required fields are present
      if (!userData.name) {
        console.warn("Auth Service - User profile missing name field");
      }
      
      return {
        id: uid,
        email: userData.email || '',
        name: userData.name || 'User',
        createdAt: userData.createdAt || new Date(),
        emailVerified: userData.emailVerified || false
      };
    } else {
      console.warn("Auth Service - User document doesn't exist for:", uid);
      return null;
    }
  } catch (error: any) {
    console.error('Auth Service - Error getting user profile:', error);
    return null;
  }
};

// Get user profile by email
export const getUserByEmail = async (email: string): Promise<UserProfile | null> => {
  try {
    console.log("Auth Service - Looking up user by email:", email);
    
    // Query the users collection
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const userData = doc.data() as UserProfile;
      console.log("Auth Service - Found user by email:", userData);
      
      return {
        id: doc.id,
        email: userData.email || email,
        name: userData.name || email.split('@')[0],
        createdAt: userData.createdAt || new Date(),
        emailVerified: userData.emailVerified || false
      };
    } else {
      console.warn("Auth Service - No user found with email:", email);
      return null;
    }
  } catch (error: any) {
    console.error('Auth Service - Error finding user by email:', error);
    return null;
  }
};

// Auth state observer
export const onAuthStateChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Resend verification email
export const resendVerificationEmail = async (): Promise<void> => {
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    await sendEmailVerification(user);
  } else {
    throw new Error('No user found or email already verified');
  }
};
