import { supabase } from './supabase';

export async function signUp(email: string, password: string, username: string) {
  // Validate password length
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  // Update the user profile with the username
  if (data.user) {
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ username })
      .eq('id', data.user.id);

    if (profileError) throw profileError;
  }

  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}