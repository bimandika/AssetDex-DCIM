import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  status: boolean;
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
    const checkUserStatus = async (user: User) => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .single();

      if (!profileData?.status) {
        await supabase.auth.signOut();
        toast({
          title: "Account Pending Approval",
          description: "Your account is pending admin approval. Please contact your administrator.",
          variant: "destructive",
        });
        return false;
      }
      return true;
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session);
        
        if (session?.user) {
          const isActive = await checkUserStatus(session.user);
          if (!isActive) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setUserRole(null);
            setLoading(false);
            return;
          }
          
          setSession(session);
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Initial session:', session);
      
      if (session?.user) {
        const isActive = await checkUserStatus(session.user);
        if (!isActive) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setUserRole(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else {
        setSession(null);
        setUser(null);
      }
      
      setLoading(false);
    };
    
    initializeAuth();

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in with:', email);
      
      // First, sign in the user
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
        return { error };
      }
      
      // Check user status if login was successful
      if (data.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', data.user.id)
          .single();
          
        if (profileError) {
          console.error('Error fetching user status:', profileError);
          await supabase.auth.signOut(); // Sign out the user if we can't verify status
          return { 
            error: new Error('Unable to verify your account status. Please try again later.') 
          };
        }
        
        if (profileData.status === false) {
          // User is inactive, sign them out and show message
          await supabase.auth.signOut();
          return { 
            error: new Error('Your account is pending admin approval. Please contact your administrator.') 
          };
        }
      }
      
      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      // Ensure user is signed out on any error
      await supabase.auth.signOut();
      return { 
        error: error instanceof Error ? error : new Error('An unexpected error occurred during sign in') 
      };
    }
  };

  const signUp = async (email: string, password: string, username: string, fullName?: string) => {
    try {
      // First, sign out any existing session to prevent auto-login
      await supabase.auth.signOut();
      
      // Create the auth user without auto-login
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Don't auto confirm the user
          emailRedirectTo: `${window.location.origin}/auth?registered=true`,
          data: {
            username,
            full_name: fullName || ''
          }
        }
      });
      
      if (signUpError) {
        toast({
          title: "Sign Up Failed",
          description: signUpError.message,
          variant: "destructive",
        });
        return { error: signUpError };
      }
      
      // If user is created, update their profile to set status to false
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            status: false,
            username,
            full_name: fullName || ''
          })
          .eq('id', data.user.id);
          
        if (profileError) {
          console.error('Error updating profile status:', profileError);
          toast({
            title: "Account Created",
            description: "Your account has been created but there was an error updating your status. Please contact support.",
            variant: "destructive"
          });
          return { error: profileError };
        }
      }
      
      // Ensure we're signed out after registration
      await supabase.auth.signOut();
      
      // Clear any existing session data
      setSession(null);
      setUser(null);
      setProfile(null);
      setUserRole(null);
      
      return { error: null };
      
    } catch (error) {
      console.error('Sign up error:', error);
      toast({
        title: "Sign Up Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
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
