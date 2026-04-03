import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { supabase } from './utils/supabase';
import authRoutes from './routes/auth';
import groupRoutes from './routes/groups';
import expenseRoutes from './routes/expenses';
import settlementRoutes from './routes/settlements';
import { authenticate } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Debt simplification endpoint (GET with groupId query param)
app.get('/api/simplify-debts', authenticate, async (req, res) => {
  const { groupId } = req.query as { groupId: string };
  if (!groupId) {
    return res.status(400).json({ error: 'groupId query param required' });
  }
  try {
    // Fetch expenses for the group
    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('*, expense_splits(*)')
      .eq('group_id', groupId)
      .eq('is_deleted', false);

    if (expError) throw expError;

    // Fetch settlements for the group
    const { data: settlements, error: settleError } = await supabase
      .from('settlements')
      .select('*')
      .eq('group_id', groupId)
      .eq('is_deleted', false);

    if (settleError) throw settleError;

    // Calculate net balances and simplify
    const balances = new Map<string, number>();

    (expenses || []).forEach((expense: any) => {
      const splits = expense.expense_splits || [];
      splits.forEach((split: any) => {
        if (split.is_deleted) return;
        balances.set(split.user_id, (balances.get(split.user_id) || 0) - Number(split.amount_owed));
        balances.set(expense.paid_by_user_id, (balances.get(expense.paid_by_user_id) || 0) + Number(split.amount_owed));
      });
    });

    (settlements || []).forEach((settlement: any) => {
      balances.set(settlement.from_user_id, (balances.get(settlement.from_user_id) || 0) + Number(settlement.amount));
      balances.set(settlement.to_user_id, (balances.get(settlement.to_user_id) || 0) - Number(settlement.amount));
    });

    // List non-zero balances
    const simplified = Array.from(balances.entries()).filter(([_, balance]) => Math.abs(balance) > 0.01);
    res.json({ simplifiedDebts: simplified });
  } catch (error) {
    res.status(500).json({ error: 'Failed to simplify debts' });
  }
});

// Balances endpoint — net balances for the current user across all their groups
app.get('/api/balances', authenticate, async (req, res) => {
  const userId = req.user!.id;
  try {
    // Get all groups the user belongs to
    const { data: memberGroups, error: groupsError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (groupsError) throw groupsError;

    const groupIds = (memberGroups || []).map((g: any) => g.group_id);

    if (groupIds.length === 0) {
      return res.json({ balances: [], totalOwed: 0, totalLent: 0 });
    }

    // Fetch all expenses in these groups with splits
    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('id, paid_by_user_id, expense_splits(user_id, amount_owed, is_deleted)')
      .in('group_id', groupIds)
      .eq('is_deleted', false);

    if (expError) throw expError;

    // Fetch all settlements in these groups
    const { data: settlements, error: settleError } = await supabase
      .from('settlements')
      .select('from_user_id, to_user_id, amount')
      .in('group_id', groupIds)
      .eq('is_deleted', false);

    if (settleError) throw settleError;

    // Calculate per-user net balance relative to currentUser
    // Positive = the other user owes currentUser
    // Negative = currentUser owes the other user
    const peerBalances = new Map<string, number>();

    (expenses || []).forEach((expense: any) => {
      const splits = (expense.expense_splits || []).filter((s: any) => !s.is_deleted);
      const paidBy = expense.paid_by_user_id;

      splits.forEach((split: any) => {
        const splitUser = split.user_id;
        const amount = Number(split.amount_owed);

        if (paidBy === userId && splitUser !== userId) {
          // Current user paid — split user owes us
          peerBalances.set(splitUser, (peerBalances.get(splitUser) || 0) + amount);
        } else if (splitUser === userId && paidBy !== userId) {
          // Current user is in a split but didn't pay — we owe paidBy
          peerBalances.set(paidBy, (peerBalances.get(paidBy) || 0) - amount);
        }
      });
    });

    (settlements || []).forEach((s: any) => {
      if (s.from_user_id === userId) {
        // We paid someone — reduces what we owe them
        peerBalances.set(s.to_user_id, (peerBalances.get(s.to_user_id) || 0) + Number(s.amount));
      } else if (s.to_user_id === userId) {
        // Someone paid us — reduces what they owe us
        peerBalances.set(s.from_user_id, (peerBalances.get(s.from_user_id) || 0) - Number(s.amount));
      }
    });

    // Get user names for the peer IDs
    const peerIds = Array.from(peerBalances.keys()).filter(id => Math.abs(peerBalances.get(id) || 0) > 0.01);

    let userNames: Record<string, string> = {};
    if (peerIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .in('id', peerIds);
      (users || []).forEach((u: any) => {
        userNames[u.id] = u.name;
      });
    }

    const balances = peerIds.map(peerId => ({
      userId: peerId,
      name: userNames[peerId] || 'Unknown',
      amount: peerBalances.get(peerId) || 0
    }));

    const totalLent = balances.filter(b => b.amount > 0).reduce((sum, b) => sum + b.amount, 0);
    const totalOwed = balances.filter(b => b.amount < 0).reduce((sum, b) => sum + Math.abs(b.amount), 0);

    res.json({ balances, totalOwed, totalLent, groupCount: groupIds.length });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch balances' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
