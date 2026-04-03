-- Run this in Supabase SQL Editor to create all tables

-- Create users table (since we're not using Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Create groups table
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  creator_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Create group_members table
CREATE TABLE group_members (
  group_id UUID REFERENCES groups(id),
  user_id UUID REFERENCES users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (group_id, user_id)
);

-- Create expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id),
  description TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  paid_by_user_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Create expense_splits table
CREATE TABLE expense_splits (
  expense_id UUID REFERENCES expenses(id),
  user_id UUID REFERENCES users(id),
  amount_owed DECIMAL(10,2) NOT NULL,
  split_type TEXT NOT NULL CHECK (split_type IN ('EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES')),
  split_value DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (expense_id, user_id)
);

-- Create settlements table
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('CASH', 'UPI', 'BANK_TRANSFER')),
  group_id UUID REFERENCES groups(id),
  date DATE NOT NULL,
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Create policies (simplified - in production, add proper user-based access)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on groups" ON groups FOR ALL USING (true);
CREATE POLICY "Allow all operations on group_members" ON group_members FOR ALL USING (true);
CREATE POLICY "Allow all operations on expenses" ON expenses FOR ALL USING (true);
CREATE POLICY "Allow all operations on expense_splits" ON expense_splits FOR ALL USING (true);
CREATE POLICY "Allow all operations on settlements" ON settlements FOR ALL USING (true);