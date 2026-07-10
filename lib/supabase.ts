import { createClient } from '@supabase/supabase-js';

// Metemos las llaves a la fuerza para ignorar el .env local por un momento
const supabaseUrl = 'https://ribtxxtjltnxhbawxdnl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpYnR4eHRqbHRueGhiYXd4ZG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NDg1MjYsImV4cCI6MjA5MjAyNDUyNn0.EfAHZH8CoOQutdCkGv_Hnkn52lNT6K04s7A2TFhWdek';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);