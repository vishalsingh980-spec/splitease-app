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

app.use(cors({
  origin: [
    'http://localhost:3000',
    /\.vercel\.app$/,
    process.env.FRONTEND_URL || ''
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/simplify-debts', authenticate, async (req, res) => {
  const { groupId } = req.query as { groupId: string };
  if (!groupId) return res.status(400).json({ error: 'groupId query param required' });
  try {
    const { data: expenses, error: expError } = await supabase
      .from('expenses').select('*, expense_splits(*)').eq('group_id', groupId).eq('is_deleted', false);
    if (expError) throw expError;
    const { data: settlements, error: settleError } = await supabase
      .from('settlements').select('*').eq('group_id', groupId).eq('is_deleted', false);
    if (settleError) throw settleError;
    const balances = new Map<string, number>();
    (expenses || []).forEach((expense: any) => {
      (expense.expense_splits || []).forEach((split: any) => {
        if (split.is_deleted) return;
        balances.set(split.user_id, (balances.get(split.user_id) || 0) - Number(split.amount_owed));
        balances.set(expense.paid_by_user_id, (balances.get(expense.paid_by_user_id) || 0) + Number(split.amount_owed));
      });
    });
    (settlements || []).forEach((s: any) => {
      balances.set(s.from_user_id, (balances.get(s.from_user_id) || 0) + Number(s.amount));
      balances.set(s.to_user_id, (balances.get(s.to_user_id) || 0) - Number(s.amount));
    });
    const simplified = Array.from(balances.entries()).filter(([_, b]) => Math.abs(b) > 0.01);
    res.json({ simplifiedDebts: simplified });
  } catch {
    res.status(500).json({ error: 'Failed to simplify debts' });
  }
});

app.get('/api/balances', authenticate, async (req, res) => {
  const userId = req.user!.id;
  try {
    const { data: memberGroups, error: groupsError } = await supabase
      .from('group_members').select('group_id').eq('user_id', userId).eq('is_deleted', false);
    if (groupsError) throw groupsError;
    const groupIds = (memberGroups || []).map((g: any) => g.group_id);
    if (groupIds.length === 0) return res.json({ balances: [], totalOwed: 0, totalLent: 0, groupCount: 0 });
    const { data: expenses, error: expError } = await supabase
      .from('expenses').select('id, paid_by_user_id, expense_splits(user_id, amount_owed, is_deleted)')
      .in('group_id', groupIds).eq('is_deleted', false);
    if (expError) throw expError;
    const { data: settlements, error: settleError } = await supabase
      .from('settlements').select('from_user_id, to_user_id, amount').in('group_id', groupIds).eq('is_deleted', false);
    if (settleError) throw settleError;
    const peerBalances = new Map<string, number>();
    (expenses || []).forEach((expense: any) => {
      const splits = (expense.expense_splits || []).filter((s: any) => !s.is_deleted);
      const paidBy = expense.paid_by_user_id;
      splits.forEach((split: any) => {
        const amount = Number(split.amount_owed);
        if (paidBy === userId && split.user_id !== userId)
          peerBalances.set(split.user_id, (peerBalances.get(split.user_id) || 0) + amount);
        else if (split.user_id === userId && paidBy !== userId)
          peerBalances.set(paidBy, (peerBalances.get(paidBy) || 0) - amount);
      });
    });
    (settlements || []).forEach((s: any) => {
      if (s.from_user_id === userId)
        peerBalances.set(s.to_user_id, (peerBalances.get(s.to_user_id) || 0) + Number(s.amount));
      else if (s.to_user_id === userId)
        peerBalances.set(s.from_user_id, (peerBalances.get(s.from_user_id) || 0) - Number(s.amount));
    });
    const peerIds = Array.from(peerBalances.keys()).filter(id => Math.abs(peerBalances.get(id) || 0) > 0.01);
    let userNames: Record<string, string> = {};
    if (peerIds.length > 0) {
      const { data: users } = await supabase.from('users').select('id, name').in('id', peerIds);
      (users || []).forEach((u: any) => { userNames[u.id] = u.name; });
    }
    const balances = peerIds.map(id => ({ userId: id, name: userNames[id] || 'Unknown', amount: peerBalances.get(id) || 0 }));
    const totalLent = balances.filter(b => b.amount > 0).reduce((s, b) => s + b.amount, 0);
    const totalOwed = balances.filter(b => b.amount < 0).reduce((s, b) => s + Math.abs(b.amount), 0);
    res.json({ balances, totalOwed, totalLent, groupCount: groupIds.length });
  } catch {
    res.status(500).json({ error: 'Failed to fetch balances' });
  }
});

export default app;
