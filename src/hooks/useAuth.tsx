import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/integrations/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type UserRole = 'customer' | 'vendor' | 'admin';

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  session: any | null; // Keep for backward compatibility 
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
  } | null;
  roles: UserRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  isVendor: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to fetch session on load
  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          if (mounted) setLoading(false);
          return;
        }

        const { data } = await api.get('/auth/session');
        if (!mounted) return;

        if (data && data.user) {
          setUser({
            id: data.user.user_id,
            email: data.user.email,
            full_name: data.user.full_name
          });
          setProfile({
            id: data.user.user_id,
            full_name: data.user.full_name,
            avatar_url: data.user.avatar_url,
            phone: null
          });
          // Assuming roles are fetched in the backend or defaulted to customer
          setRoles(['customer']); // TODO: Load actual roles from API
        }
      } catch (error) {
        console.error('Error getting session:', error);
        localStorage.removeItem('access_token');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data } = await api.post('/auth/signin', { email, password });

      localStorage.setItem('access_token', data.session.access_token);

      setUser({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.full_name
      });
      setProfile({
        id: data.user.id,
        full_name: data.user.full_name,
        avatar_url: null,
        phone: null
      });
      setRoles(['customer']);

      toast.success('Welcome back!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to sign in');
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data } = await api.post('/auth/signup', { email, password, full_name: fullName });

      localStorage.setItem('access_token', data.session.access_token);

      setUser({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.full_name
      });
      setProfile({
        id: data.user.id,
        full_name: data.user.full_name,
        avatar_url: null,
        phone: null
      });
      setRoles(['customer']);

      toast.success('Account created!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create account');
      throw error;
    }
  };

  const signOut = async () => {
    localStorage.removeItem('access_token');
    setUser(null);
    setProfile(null);
    setRoles([]);
    toast.success('Signed out successfully');
  };

  const resetPassword = async (email: string) => {
    toast.info('Password reset not configured yet');
  };

  const hasRole = (role: UserRole) => roles.includes(role);
  const isVendor = hasRole('vendor') || hasRole('admin');
  const isAdmin = hasRole('admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        session: null, // Legacy supbase payload compatibility
        profile,
        roles,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        hasRole,
        isVendor,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const ProtectedRoute = ({
  children,
  requiredRole
}: {
  children: ReactNode;
  requiredRole?: UserRole
}) => {
  const { user, loading, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && user && requiredRole && !hasRole(requiredRole)) {
      toast.error('You do not have permission to access this page');
      navigate('/');
    }
  }, [user, loading, requiredRole, hasRole, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) return null;
  if (requiredRole && !hasRole(requiredRole)) return null;

  return <>{children}</>;
};
