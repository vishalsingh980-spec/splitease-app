import express from 'express';
import { supabase } from '../utils/supabase';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Create group
router.post('/', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user!.id;

    console.log('[groups] creating group, userId from JWT:', userId);

    // Ensure the user actually exists — if not, upsert them
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      console.log('[groups] user not found in DB, inserting placeholder for', userId);
      await supabase.from('users').insert({ id: userId, name: 'User' });
    }

    const { data, error } = await supabase
      .from('groups')
      .insert({ name, creator_id: userId })
      .select()
      .single();
    if (error) throw error;

    await supabase
      .from('group_members')
      .insert({ group_id: data.id, user_id: req.user!.id });

    res.status(201).json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get user's groups
router.get('/', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_members!inner(user_id),
        creator:users!groups_creator_id_fkey(id, name)
      `)
      .eq('group_members.user_id', req.user!.id)
      .eq('is_deleted', false);
    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add member to group
router.post('/:id/members', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;
    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: req.params.id, user_id: userId });
    if (error) throw error;

    res.status(201).json({ message: 'Member added' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get group members
router.get('/:id/members', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        user_id,
        users!group_members_user_id_fkey(id, name, email)
      `)
      .eq('group_id', req.params.id);
    if (error) throw error;

    const members = data.map(item => {
      const user = Array.isArray(item.users) ? item.users[0] : item.users as any;
      return { id: user.id, name: user.name, email: user.email };
    });

    res.json(members);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;