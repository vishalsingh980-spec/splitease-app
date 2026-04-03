import express from 'express';
import { supabase } from '../utils/supabase';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Create settlement
router.post('/', authenticate, async (req, res) => {
  try {
    const { fromUserId, toUserId, amount, method, groupId, date } = req.body;
    const { data, error } = await supabase
      .from('settlements')
      .insert({
        from_user_id: fromUserId,
        to_user_id: toUserId,
        amount,
        method,
        group_id: groupId,
        date,
        created_by_user_id: req.user!.id
      })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get user settlements
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .or(`from_user_id.eq.${req.params.userId},to_user_id.eq.${req.params.userId}`)
      .eq('is_deleted', false);
    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;