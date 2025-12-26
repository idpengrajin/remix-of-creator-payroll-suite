import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Agency {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  subscription_status: string;
  max_creators: number;
}

interface AgencyMembership {
  agency_id: string;
  role: string;
  agency: Agency;
}

interface ImpersonationState {
  isImpersonating: boolean;
  originalAgencyId: string | null;
  impersonatedAgencyId: string | null;
  impersonatedAgencyName: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  userName: string | null;
  loading: boolean;
  currentAgency: Agency | null;
  agencyRole: string | null;
  agencies: AgencyMembership[];
  isSuperAdmin: boolean;
  impersonation: ImpersonationState;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, options?: SignUpOptions) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateUserName: (name: string) => void;
  switchAgency: (agencyId: string) => void;
  startImpersonation: (agencyId: string, agencyName: string) => void;
  stopImpersonation: () => void;
}

interface SignUpOptions {
  isAgencyOwner?: boolean;
  agencyName?: string;
  invitationToken?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentAgency, setCurrentAgency] = useState<Agency | null>(null);
  const [agencyRole, setAgencyRole] = useState<string | null>(null);
  const [agencies, setAgencies] = useState<AgencyMembership[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [impersonation, setImpersonation] = useState<ImpersonationState>({
    isImpersonating: false,
    originalAgencyId: null,
    impersonatedAgencyId: null,
    impersonatedAgencyName: null,
  });
  const navigate = useNavigate();

  // Check for saved impersonation on mount
  useEffect(() => {
    const savedImpersonation = localStorage.getItem("impersonation");
    if (savedImpersonation) {
      try {
        const parsed = JSON.parse(savedImpersonation);
        setImpersonation(parsed);
      } catch {
        localStorage.removeItem("impersonation");
      }
    }
  }, []);

  const fetchAgencyData = async (userId: string) => {
    try {
      // Check if user is super admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "SUPER_ADMIN")
        .maybeSingle();
      
      const superAdmin = !!roleData;
      setIsSuperAdmin(superAdmin);

      // Fetch user's agency memberships
      const { data: memberships, error: membershipError } = await supabase
        .from("agency_members")
        .select(`
          agency_id,
          role,
          agency:agencies (
            id,
            name,
            slug,
            subscription_plan,
            subscription_status,
            max_creators
          )
        `)
        .eq("user_id", userId);

      if (membershipError) {
        console.error("Error fetching agency memberships:", membershipError);
        return;
      }

      if (memberships && memberships.length > 0) {
        const formattedMemberships: AgencyMembership[] = memberships.map((m: any) => ({
          agency_id: m.agency_id,
          role: m.role,
          agency: m.agency,
        }));
        
        setAgencies(formattedMemberships);
        
        // Check if we're in impersonation mode
        const savedImpersonation = localStorage.getItem("impersonation");
        if (savedImpersonation && superAdmin) {
          try {
            const parsed = JSON.parse(savedImpersonation);
            if (parsed.isImpersonating && parsed.impersonatedAgencyId) {
              // Fetch the impersonated agency data
              const { data: impersonatedAgency } = await supabase
                .from("agencies")
                .select("*")
                .eq("id", parsed.impersonatedAgencyId)
                .single();
              
              if (impersonatedAgency) {
                setCurrentAgency(impersonatedAgency);
                setAgencyRole("AGENCY_OWNER"); // Super admin gets full access when impersonating
                setImpersonation(parsed);
                return;
              }
            }
          } catch {
            localStorage.removeItem("impersonation");
          }
        }
        
        // Set current agency from localStorage or first agency
        const savedAgencyId = localStorage.getItem("currentAgencyId");
        const savedAgency = formattedMemberships.find(m => m.agency_id === savedAgencyId);
        
        if (savedAgency) {
          setCurrentAgency(savedAgency.agency);
          setAgencyRole(savedAgency.role);
        } else {
          setCurrentAgency(formattedMemberships[0].agency);
          setAgencyRole(formattedMemberships[0].role);
          localStorage.setItem("currentAgencyId", formattedMemberships[0].agency_id);
        }
      }
    } catch (error) {
      console.error("Error in fetchAgencyData:", error);
    }
  };

  const checkUserStatusAndSetState = async (session: Session | null) => {
    if (!session?.user) {
      setSession(null);
      setUser(null);
      setUserRole(null);
      setUserName(null);
      setCurrentAgency(null);
      setAgencyRole(null);
      setAgencies([]);
      setIsSuperAdmin(false);
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
          .select("name, role, status, agency_id")
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
        setCurrentAgency(null);
        setAgencyRole(null);
        setAgencies([]);
        setLoading(false);
        navigate("/auth?pending=true");
        return;
      }
      
      setUserRole(profileData.role);
      setUserName(profileData.name);
      
      // Fetch agency data
      await fetchAgencyData(session.user.id);
      
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
            setCurrentAgency(null);
            setAgencyRole(null);
            setAgencies([]);
            setIsSuperAdmin(false);
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

  const signUp = async (email: string, password: string, name: string, options?: SignUpOptions) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const metadata: Record<string, any> = { name };
    
    if (options?.isAgencyOwner) {
      metadata.is_agency_owner = true;
      metadata.agency_name = options.agencyName || "My Agency";
    }
    
    if (options?.invitationToken) {
      metadata.invitation_token = options.invitationToken;
    }
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata,
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
    setCurrentAgency(null);
    setAgencyRole(null);
    setAgencies([]);
    setIsSuperAdmin(false);
    setImpersonation({
      isImpersonating: false,
      originalAgencyId: null,
      impersonatedAgencyId: null,
      impersonatedAgencyName: null,
    });
    localStorage.removeItem("currentAgencyId");
    localStorage.removeItem("impersonation");
    
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

  const switchAgency = (agencyId: string) => {
    const membership = agencies.find(a => a.agency_id === agencyId);
    if (membership) {
      setCurrentAgency(membership.agency);
      setAgencyRole(membership.role);
      localStorage.setItem("currentAgencyId", agencyId);
    }
  };

  const startImpersonation = async (agencyId: string, agencyName: string) => {
    if (!isSuperAdmin) return;
    
    const originalId = currentAgency?.id || null;
    
    // Fetch the impersonated agency
    const { data: impersonatedAgency } = await supabase
      .from("agencies")
      .select("*")
      .eq("id", agencyId)
      .single();
    
    if (impersonatedAgency) {
      const newImpersonation: ImpersonationState = {
        isImpersonating: true,
        originalAgencyId: originalId,
        impersonatedAgencyId: agencyId,
        impersonatedAgencyName: agencyName,
      };
      
      setImpersonation(newImpersonation);
      setCurrentAgency(impersonatedAgency);
      setAgencyRole("AGENCY_OWNER"); // Full access when impersonating
      localStorage.setItem("impersonation", JSON.stringify(newImpersonation));
      localStorage.setItem("currentAgencyId", agencyId);
    }
  };

  const stopImpersonation = () => {
    const originalId = impersonation.originalAgencyId;
    
    setImpersonation({
      isImpersonating: false,
      originalAgencyId: null,
      impersonatedAgencyId: null,
      impersonatedAgencyName: null,
    });
    localStorage.removeItem("impersonation");
    
    // Return to original agency or first available
    if (originalId) {
      const originalMembership = agencies.find(a => a.agency_id === originalId);
      if (originalMembership) {
        setCurrentAgency(originalMembership.agency);
        setAgencyRole(originalMembership.role);
        localStorage.setItem("currentAgencyId", originalId);
        return;
      }
    }
    
    // Fallback to first agency
    if (agencies.length > 0) {
      setCurrentAgency(agencies[0].agency);
      setAgencyRole(agencies[0].role);
      localStorage.setItem("currentAgencyId", agencies[0].agency_id);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      userRole, 
      userName, 
      loading, 
      currentAgency,
      agencyRole,
      agencies,
      isSuperAdmin,
      impersonation,
      signIn, 
      signUp, 
      signOut, 
      updateUserName,
      switchAgency,
      startImpersonation,
      stopImpersonation
    }}>
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
