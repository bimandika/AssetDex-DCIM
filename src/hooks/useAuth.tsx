import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
}

interface UserRole {
  role: 'super_admin' | 'engineer' | 'viewer';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  userRole: UserRole['role'] | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ error: any }>;
  hasRole: (role: 'super_admin' | 'engineer' | 'viewer') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole['role'] | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      console.log('Profile data:', profileData);
      setProfile(profileData);

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError) {
        console.error('Error fetching role:', roleError);
        setUserRole('viewer');
        return;
      }

      console.log('Role data:', roleData);
      setUserRole(roleData.role);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in with:', email);
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      console.log('Sign in response:', { error, data });
      
      if (error) {
        console.error('Sign in error:', error);
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
      }
      
      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, username: string, fullName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username,
            full_name: fullName || ''
          }
        }
      });
      
      if (error) {
        toast({
          title: "Sign Up Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sign Up Successful",
          description: "Please check your email to confirm your account.",
        });
      }
      
      return { error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      // First, reauthenticate the user
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (authError) {
        return { error: new Error('Current password is incorrect') };
      }

      // Update the password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your password has been updated successfully.",
      });

      return { error: null };
    } catch (error: any) {
      console.error('Error updating password:', error);
      return { 
        error: error instanceof Error ? error : new Error('Failed to update password') 
      };
    }
  };

  const hasRole = (role: 'super_admin' | 'engineer' | 'viewer') => {
    if (!userRole) return false;
    
    const roleHierarchy = {
      'super_admin': 3,
      'engineer': 2,
      'viewer': 1
    };
    
    return roleHierarchy[userRole] >= roleHierarchy[role];
  };

  const value = {
    user,
    session,
    profile,
    userRole,
    loading,
    signIn,
    signUp,
    signOut,
    updatePassword,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
