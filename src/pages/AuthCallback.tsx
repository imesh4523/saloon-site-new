import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * This page is the OAuth callback landing page.
 * The backend redirects here after successful Google login with:
 *   /auth/callback?token=JWT&id=UUID&email=EMAIL&name=NAME&roles=customer,vendor
 * 
 * We store the token in localStorage and redirect to home.
 */
const AuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        const id = searchParams.get('id');
        const email = searchParams.get('email');
        const name = searchParams.get('name');
        const rolesStr = searchParams.get('roles');
        const error = searchParams.get('error');

        if (error) {
            toast.error('Google sign-in failed. Please try again.');
            navigate('/auth');
            return;
        }

        if (token && id && email) {
            // Store the auth token
            localStorage.setItem('auth_token', token);

            // Store user info so useAuth can read it immediately
            const user = {
                id,
                email: decodeURIComponent(email),
                full_name: name ? decodeURIComponent(name) : '',
                roles: rolesStr ? rolesStr.split(',') : ['customer'],
            };
            localStorage.setItem('auth_user', JSON.stringify(user));

            toast.success(`Welcome, ${user.full_name || user.email}!`);
            navigate('/', { replace: true });
        } else {
            toast.error('Something went wrong with Google sign-in.');
            navigate('/auth');
        }
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Completing sign-in...</p>
            </div>
        </div>
    );
};

export default AuthCallback;
