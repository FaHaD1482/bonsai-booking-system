import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:', {
        url: supabaseUrl ? 'provided' : 'MISSING',
        key: supabaseAnonKey ? 'provided' : 'MISSING',
    });
}

console.log('Supabase URL:', supabaseUrl?.substring(0, 30) + '...');
console.log('Supabase Anon Key:', supabaseAnonKey?.substring(0, 30) + '...');

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export default supabase;