import { useEffect, useState } from 'react';
import supabase from '../services/supabaseClient';
import { User } from '../types';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'shifat@bonsai.com';

const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                
                if (user) {
                    setUser({
                        id: user.id,
                        email: user.email || '',
                        user_metadata: user.user_metadata,
                    });
                    setIsAdmin(user.email === ADMIN_EMAIL);
                }
                setLoading(false);
            } catch (err) {
                console.error('Auth check failed:', err);
                setLoading(false);
            }
        };

        checkAuth();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_, session) => {
            if (session?.user) {
                setUser({
                    id: session.user.id,
                    email: session.user.email || '',
                    user_metadata: session.user.user_metadata,
                });
                setIsAdmin(session.user.email === ADMIN_EMAIL);
            } else {
                setUser(null);
                setIsAdmin(false);
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                setError(error.message);
                return { user: null, error: error.message };
            }
            if (data.user?.email !== ADMIN_EMAIL) {
                await supabase.auth.signOut();
                setError('Unauthorized. Only admin access allowed.');
                return { user: null, error: 'Unauthorized access' };
            }
            setLoading(false);
            return { user: data.user, error: null };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Sign in failed';
            setError(message);
            setLoading(false);
            return { user: null, error: message };
        }
    };

    const signOut = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                setError(error.message);
                return { error: error.message };
            }
            setUser(null);
            setIsAdmin(false);
            setLoading(false);
            return { error: null };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Sign out failed';
            setError(message);
            setLoading(false);
            return { error: message };
        }
    };

    return { user, loading, error, signIn, signOut, isAdmin };
};

export default useAuth;