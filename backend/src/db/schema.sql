-- Comptes utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(255) UNIQUE NOT NULL,
  pseudo VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  token_balance BIGINT NOT NULL DEFAULT 0, -- jetons virtuels
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rooms / parties
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(10) UNIQUE NOT NULL,
  stake_amount BIGINT NOT NULL, -- mise par joueur
  status VARCHAR(20) NOT NULL DEFAULT 'LOBBY',
  -- LOBBY | COLLECTING_STAKES | IN_PROGRESS | CANCELLED_TIE | FINISHED
  pot_total BIGINT DEFAULT 0,
  commission_amount BIGINT DEFAULT 0,
  winner_id UUID REFERENCES users(id),
  round_number INT DEFAULT 1, -- incrémenté à chaque égalité/rejoue
  created_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ
);

-- Participants d'une partie
CREATE TABLE IF NOT EXISTS game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  user_id UUID REFERENCES users(id),
  turn_order INT,
  has_paid_stake BOOLEAN DEFAULT false,
  dice1 INT,
  dice2 INT,
  score INT, -- dice1+dice2, recalculé à chaque round
  is_million BOOLEAN DEFAULT false,
  has_rolled BOOLEAN DEFAULT false,
  UNIQUE(game_id, user_id)
);

-- Historique des transactions (jetons)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  game_id UUID REFERENCES games(id),
  type VARCHAR(20) NOT NULL, -- STAKE | PAYOUT | COMMISSION | TOPUP (phase 2)
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Revenu plateforme (pour dashboard admin)
CREATE TABLE IF NOT EXISTS platform_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
