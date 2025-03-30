import React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Check for active session on component mount
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setLoading(false);
          return;
        }

        if (session) {
          setUser(session.user);
          
          // Check if user is admin
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userError && userError.code !== 'PGRST116') {
            console.error('User data error:', userError);
          } else {
            setIsAdmin(userData?.is_admin || false);
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        
        // Check if user is admin
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!userError) {
          setIsAdmin(userData?.is_admin || false);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // =====================================================================
  // SIGN UP FUNCTIONALITY - CURRENTLY DISABLED FOR SECURITY
  // To re-enable sign-ups, uncomment the function below
  // WARNING: Enabling this allows anyone to create an account
  // =====================================================================
  /*
  const signUp = async (email, password) => {
    try {
      // Sign up with auto-confirmation (no email verification)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            email_confirmed: true
          }
        }
      });

      if (error) {
        setAuthError(error.message);
        throw error;
      }

      // Create initial profile record
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              is_admin: false,
              subscription_type: 'Free Trial',
              post_limit: 5,
              posts_used: 0,
            },
          ]);

        if (profileError) {
          console.error('Error creating user profile:', profileError);
        }
      }

      setAuthError(null);
      return { data, error: null };
    } catch (error) {
      console.error('Error signing up:', error);
      setAuthError(error.message);
      return { data: null, error };
    }
  };
  */
  // =====================================================================
  // END OF SIGN UP FUNCTIONALITY
  // =====================================================================

  const signIn = async (email, password) => {
    try {
      console.log('Signing in with:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        setAuthError(error.message);
        throw error;
      }

      console.log('Sign in successful:', data);
      
      // Ensure user state is set immediately
      if (data.user) {
        setUser(data.user);
        
        // Check if user is admin
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (!userError) {
          setIsAdmin(userData?.is_admin || false);
        }
      }
      
      setAuthError(null);
      return { data, error: null };
    } catch (error) {
      console.error('Error signing in:', error);
      setAuthError(error.message);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        setAuthError(error.message);
        throw error;
      }
      
      setAuthError(null);
      return { error: null };
    } catch (error) {
      console.error('Error signing out:', error);
      setAuthError(error.message);
      return { error };
    }
  };

  const value = {
    user,
    isAdmin,
    loading,
    authError,
    // signUp,  // Uncomment this line when re-enabling sign-up functionality
    signIn,
    signOut,
    supabase
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
