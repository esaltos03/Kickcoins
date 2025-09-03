/*
  # Initial KickCoins Database Schema

  1. New Tables
    - `user_profiles` - Extended user profile data
      - `id` (uuid, primary key, references auth.users)
      - `username` (text, unique)
      - `total_coins` (integer, default 100)
      - `available_coins` (integer, default 0)
      - `mvp_points` (integer, default 0)
      - `is_admin` (boolean, default false)
      - `voted` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_votes` - MVP voting data
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `first_place` (text)
      - `second_place` (text)
      - `third_place` (text)
      - `match_id` (text, default 'current')
      - `created_at` (timestamp)
    
    - `user_bets` - Betting data
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `player` (text)
      - `prop` (text)
      - `amount` (integer)
      - `odds` (integer, default 4)
      - `resolved` (boolean, default false)
      - `won` (boolean, default false)
      - `match_id` (text, default 'current')
      - `created_at` (timestamp)
    
    - `bet_history` - Historical betting data
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `match_name` (text)
      - `bets_data` (jsonb)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add admin policies for full access

  3. Functions
    - Trigger function to handle new user creation
    - Trigger function to update timestamps
*/

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  total_coins integer DEFAULT 100,
  available_coins integer DEFAULT 0,
  mvp_points integer DEFAULT 0,
  is_admin boolean DEFAULT false,
  voted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user votes table
CREATE TABLE IF NOT EXISTS user_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  first_place text NOT NULL,
  second_place text NOT NULL,
  third_place text NOT NULL,
  match_id text DEFAULT 'current',
  created_at timestamptz DEFAULT now()
);

-- Create user bets table
CREATE TABLE IF NOT EXISTS user_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  player text NOT NULL,
  prop text NOT NULL,
  amount integer NOT NULL,
  odds integer DEFAULT 4,
  resolved boolean DEFAULT false,
  won boolean DEFAULT false,
  match_id text DEFAULT 'current',
  created_at timestamptz DEFAULT now()
);

-- Create bet history table
CREATE TABLE IF NOT EXISTS bet_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  match_name text NOT NULL,
  bets_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_history ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Allow service role full access"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- User votes policies
CREATE POLICY "Users can manage own votes"
  ON user_votes
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all votes"
  ON user_votes
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.is_admin = true
  ));

-- User bets policies
CREATE POLICY "Users can manage own bets"
  ON user_bets
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all bets"
  ON user_bets
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.is_admin = true
  ));

-- Bet history policies
CREATE POLICY "Users can read own history"
  ON bet_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own history"
  ON bet_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all history"
  ON bet_history
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.is_admin = true
  ));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();