import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  userName: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateUserName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const checkUserStatusAndSetState = async (session: Session | null) => {
    if (!session?.user) {
      setSession(null);
      setUser(null);
      setUserRole(null);
      setUserName(null);
      setLoading(false);
      return;
    }

    setSession(session);
    setUser(session.user);
    setLoading(true);

    try {
      // Fetch profile data with retry logic
      let profileData = null;
      let profileError = null;
      let retries = 3;
      
      while (retries > 0 && !profileData) {
        const result = await supabase
          .from("profiles")
          .select("name, role, status")
          .eq("id", session.user.id)
          .maybeSingle();
        
        profileData = result.data;
        profileError = result.error;
        
        if (profileError || !profileData) {
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else {
          break;
        }
      }
      
      if (profileError) {
        setUserRole(null);
        setUserName(null);
        setLoading(false);
        return;
      }
      
      if (!profileData) {
        setUserRole(null);
        setUserName(null);
        setLoading(false);
        return;
      }
      
      // Check if user is pending approval
      if (profileData?.status === "PENDING_APPROVAL") {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setUserRole(null);
        setUserName(null);
        setLoading(false);
        navigate("/auth?pending=true");
        return;
      }
      
      setUserRole(profileData.role);
      setUserName(profileData.name);
      setLoading(false);
    } catch (error) {
      setUserRole(null);
      setUserName(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener - keep it synchronous to avoid deadlocks
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Update session state synchronously
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Defer profile fetch with setTimeout to avoid deadlock
          if (session?.user) {
            setTimeout(() => {
              if (mounted) {
                checkUserStatusAndSetState(session);
              }
            }, 0);
          } else {
            setUserRole(null);
            setUserName(null);
            setLoading(false);
          }
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          checkUserStatusAndSetState(session);
        } else {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    setLoading(true);
    
    // Clear local state first regardless of API result
    setUser(null);
    setSession(null);
    setUserRole(null);
    setUserName(null);
    
    try {
      // Attempt to sign out from Supabase (may fail if session already expired)
      await supabase.auth.signOut();
    } catch (error) {
      // Ignore errors - session may already be invalid
    }
    
    setLoading(false);
    navigate("/auth");
  };

  const updateUserName = (name: string) => {
    setUserName(name);
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, userName, loading, signIn, signUp, signOut, updateUserName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
