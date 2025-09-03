import { supabase } from './supabase';
import {
  createUserProfile,
  updateUserProfile,
  getAllUserProfiles,
  submitVote,
  getUserVotes,
  placeBet,
  getUserBets,
  getAllBets,
  resolveBet,
  saveBetHistory,
  getUserBetHistory,
  distributeCoins,
  resetVoting,
  clearAvailableCoins
} from './database';

// Authentication functions
export async function signUp(username: string, password: string) {
  const email = `${username}@kickcoins.local`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    if (error.message.includes('already registered')) {
      throw new Error('Username already exists');
    }
    throw error;
  }

  if (data.user) {
    // Create user profile
    await createUserProfile(data.user.id, username);
  }

  return data;
}

export async function signIn(username: string, password: string) {
  const email = `${username}@kickcoins.local`;
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

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
    .maybeSingle();

  if (error) throw error;
  return data;
}