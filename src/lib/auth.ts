import { supabase } from './supabase';

export async function signUp(username: string, password: string) {
  // Validate password length
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  // Check if username already exists
  const { data: existingUser } = await supabase
    .from('user_profiles')
    .select('username')
    .eq('username', username)
    .single();

  if (existingUser) {
    throw new Error('Username already exists');
  }

  // Create a dummy email using the username
  const email = `${username}@kickcoins.local`;

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

export async function signIn(username: string, password: string) {
  // Convert username to email format for Supabase auth
  const email = `${username}@kickcoins.local`;

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