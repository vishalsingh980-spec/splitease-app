import express from 'express';
import { supabase } from '../utils/supabase';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Create expense
router.post('/', authenticate, async (req, res) => {
  try {
    const { groupId, description, totalAmount, paidByUserId, date, splits } = req.body;
    
    // Calculate amounts for splits
    const numMembers = splits.length;
    const splitsWithAmounts = splits.map((split: any) => {
      let amountOwed = 0;
      switch (split.splitType) {
        case 'EQUAL':
          amountOwed = totalAmount / numMembers;
          break;
        case 'EXACT':
          amountOwed = split.splitValue;
          break;
        case 'PERCENTAGE':
          amountOwed = (totalAmount * split.splitValue) / 100;
          break;
        case 'SHARES':
          const totalShares = splits.reduce((sum: number, s: any) => sum + (s.splitType === 'SHARES' ? s.splitValue : 0), 0);
          amountOwed = (totalAmount * split.splitValue) / totalShares;
          break;
      }
      return { ...split, amountOwed };
    });

    const { data: expense, error: expError } = await supabase
      .from('expenses')
      .insert({
        group_id: groupId,
        description,
        total_amount: totalAmount,
        paid_by_user_id: paidByUserId,
        date,
        created_by_user_id: req.user!.id
      })
      .select()
      .single();
    if (expError) throw expError;

    const splitsData = splitsWithAmounts.map((s: any) => ({
      expense_id: expense.id,
      user_id: s.userId,
      amount_owed: s.amountOwed,
      split_type: s.splitType,
      split_value: s.splitValue
    }));

    const { error: splitError } = await supabase
      .from('expense_splits')
      .insert(splitsData);
    if (splitError) throw splitError;

    res.status(201).json({ ...expense, splits: splitsWithAmounts });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get expenses (by group or all)
router.get('/', authenticate, async (req, res) => {
  try {
    const { groupId } = req.query;
    let query = supabase
      .from('expenses')
      .select(`
        *,
        expense_splits(
          amount_owed,
          users!expense_splits_user_id_fkey(id, name)
        ),
        paid_by_user:users!expenses_paid_by_user_id_fkey(id, name)
      `)
      .eq('is_deleted', false);

    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Transform the data to match frontend expectations
    const transformedData = data.map(expense => ({
      id: expense.id,
      description: expense.description,
      total_amount: expense.total_amount,
      date: expense.date,
      paid_by_user: { name: expense.paid_by_user.name },
      expense_splits: expense.expense_splits.map((split: any) => ({
        user: { name: split.users.name },
        amount_owed: split.amount_owed
      }))
    }));

    res.json(transformedData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get group expenses
router.get('/group/:groupId', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        expense_splits(*),
        paid_by:users!expenses_paid_by_user_id_fkey(id, name)
      `)
      .eq('group_id', req.params.groupId)
      .eq('is_deleted', false);
    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;