import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User, AuthContextType } from '../types';
import { 
  signUp as firebaseSignUp, 
  signIn as firebaseSignIn, 
  signOutUser, 
  onAuthStateChange, 
  getUserProfile,
  resendVerificationEmail
} from '../services/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // First check if we have cached user info
    const cachedUserData = localStorage.getItem('kanban_user');
    if (cachedUserData) {
      try {
        const parsedUser = JSON.parse(cachedUserData);
        // Convert string dates back to Date objects
        if (parsedUser.createdAt) {
          parsedUser.createdAt = new Date(parsedUser.createdAt);
        }
        console.log("AuthContext - Loaded user from cache:", parsedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error("AuthContext - Failed to parse cached user data:", e);
      }
    }
    
    const unsubscribe = onAuthStateChange(async (firebaseUser: FirebaseUser | null) => {
      try {
        console.log("AuthContext - Auth state changed:", firebaseUser?.uid, "verified:", firebaseUser?.emailVerified);
        
        if (firebaseUser && firebaseUser.emailVerified) {
          // Get user profile from Firestore
          const userProfile = await getUserProfile(firebaseUser.uid);
          console.log("AuthContext - User profile loaded:", userProfile);
          
          if (userProfile) {
            const userData: User = {
              id: userProfile.id,
              email: userProfile.email || firebaseUser.email || '',
              name: userProfile.name || 'User',
              theme: 'light',
              createdAt: userProfile.createdAt || new Date()
            };
            console.log("AuthContext - Setting user:", userData);
            setUser(userData);
            
            // Cache the user data
            localStorage.setItem('kanban_user', JSON.stringify(userData));
          } else {
            console.warn("AuthContext - No user profile found for:", firebaseUser.uid);
            // Fallback user object from Firebase auth
            const fallbackUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'User',
              theme: 'light',
              createdAt: new Date()
            };
            console.log("AuthContext - Setting fallback user:", fallbackUser);
            setUser(fallbackUser);
            
            // Cache the fallback user data
            localStorage.setItem('kanban_user', JSON.stringify(fallbackUser));
          }
        } else {
          console.log("AuthContext - No authenticated user or email not verified");
          setUser(null);
          // Clear cached user data
          localStorage.removeItem('kanban_user');
        }
      } catch (error) {
        console.error("AuthContext - Error processing auth state change:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      await firebaseSignIn(email, password);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const register = async (email: string, password: string, name: string): Promise<void> => {
    try {
      await firebaseSignUp(email, password, name);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOutUser();
      setUser(null);
      // Clear cached user data
      localStorage.removeItem('kanban_user');
      console.log("AuthContext - User successfully logged out");
    } catch (error: any) {
      console.error("AuthContext - Error during logout:", error);
      throw new Error(error.message);
    }
  };

  const resetPassword = async (_email: string): Promise<void> => {
    // This would be implemented with Firebase's sendPasswordResetEmail
    throw new Error('Password reset functionality will be implemented with Firebase');
  };

  const resendVerification = async (): Promise<void> => {
    try {
      await resendVerificationEmail();
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    resetPassword,
    loading,
    resendVerification
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};