import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface UserProfile {
  id: string;
  username: string;
  total_coins: number;
  available_coins: number;
  mvp_points: number;
  is_admin: boolean;
  voted: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserVote {
  id: string;
  user_id: string;
  first_place: string;
  second_place: string;
  third_place: string;
  match_id: string;
  created_at: string;
}

export interface UserBet {
  id: string;
  user_id: string;
  player: string;
  prop: string;
  amount: number;
  odds: number;
  resolved: boolean;
  won: boolean;
  match_id: string;
  created_at: string;
}

export interface BetHistory {
  id: string;
  user_id: string;
  match_name: string;
  bets_data: any;
  created_at: string;
}