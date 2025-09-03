import { supabase } from './supabase';
import type { UserProfile, UserVote, UserBet, BetHistory } from './supabase';

// User Profile Operations
export async function createUserProfile(userId: string, username: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      username,
      total_coins: 100,
      available_coins: 0,
      mvp_points: 0,
      is_admin: false,
      voted: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAllUserProfiles() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('total_coins', { ascending: false });

  if (error) throw error;
  return data;
}

// Voting Operations
export async function submitVote(userId: string, firstPlace: string, secondPlace: string, thirdPlace: string) {
  // First, delete any existing vote for this match
  await supabase
    .from('user_votes')
    .delete()
    .eq('user_id', userId)
    .eq('match_id', 'current');

  const { data, error } = await supabase
    .from('user_votes')
    .insert({
      user_id: userId,
      first_place: firstPlace,
      second_place: secondPlace,
      third_place: thirdPlace,
      match_id: 'current'
    })
    .select()
    .single();

  if (error) throw error;

  // Update user as voted
  await updateUserProfile(userId, { voted: true });

  return data;
}

export async function getUserVotes(matchId: string = 'current') {
  const { data, error } = await supabase
    .from('user_votes')
    .select('*')
    .eq('match_id', matchId);

  if (error) throw error;
  return data;
}

// Betting Operations
export async function placeBet(userId: string, player: string, prop: string, amount: number, odds: number = 4) {
  const { data, error } = await supabase
    .from('user_bets')
    .insert({
      user_id: userId,
      player,
      prop,
      amount,
      odds,
      match_id: 'current'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserBets(userId: string, matchId: string = 'current') {
  const { data, error } = await supabase
    .from('user_bets')
    .select('*')
    .eq('user_id', userId)
    .eq('match_id', matchId);

  if (error) throw error;
  return data;
}

export async function getAllBets(matchId: string = 'current') {
  const { data, error } = await supabase
    .from('user_bets')
    .select('*')
    .eq('match_id', matchId);

  if (error) throw error;
  return data;
}

export async function resolveBet(betId: string, won: boolean) {
  const { data, error } = await supabase
    .from('user_bets')
    .update({
      resolved: true,
      won
    })
    .eq('id', betId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// History Operations
export async function saveBetHistory(userId: string, matchName: string, betsData: any) {
  const { data, error } = await supabase
    .from('bet_history')
    .insert({
      user_id: userId,
      match_name: matchName,
      bets_data: betsData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserBetHistory(userId: string) {
  const { data, error } = await supabase
    .from('bet_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Admin Operations
export async function distributeCoins(amount: number = 10) {
  // Get all non-admin users
  const { data: users, error: usersError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('is_admin', false);

  if (usersError) throw usersError;

  // Update each user's coins
  const updates = users.map(user => {
    const maxCoins = Math.min(amount, user.total_coins);
    return supabase
      .from('user_profiles')
      .update({
        available_coins: maxCoins,
        total_coins: user.total_coins - maxCoins
      })
      .eq('id', user.id);
  });

  await Promise.all(updates);
}

export async function resetVoting() {
  // Reset all users' voted status
  const { error } = await supabase
    .from('user_profiles')
    .update({ voted: false })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all users

  if (error) throw error;
}

export async function clearAvailableCoins() {
  const { error } = await supabase
    .from('user_profiles')
    .update({ available_coins: 0 })
    .eq('is_admin', false);

  if (error) throw error;
}