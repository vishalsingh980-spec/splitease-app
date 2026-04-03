import express from 'express';
import { supabase } from '../utils/supabase';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'splitwise-secret';

// Generate OTP
function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// Send OTP (store in DB)
router.post('/send-otp', async (req, res) => {
  try {
    const { identifier, type } = req.body; // identifier: email or phone, type: 'email' or 'phone'

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP
    const { error } = await supabase
      .from('otp_master')
      .insert({
        identifier,
        otp,
        type,
        expires_at: expiresAt.toISOString()
      });

    if (error) throw error;

    // In real app, send OTP via email/SMS. For now, just return it
    console.log(`OTP for ${identifier}: ${otp}`); // Remove in production

    res.json({ message: 'OTP sent successfully', otp }); // Remove otp in response for production
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verify OTP and login/register
router.post('/verify-otp', async (req, res) => {
  try {
    const { identifier, otp, name } = req.body;

    // Check OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_master')
      .select('*')
      .eq('identifier', identifier)
      .eq('otp', otp)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (otpError || !otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Mark OTP as used
    await supabase
      .from('otp_master')
      .update({ is_used: true })
      .eq('id', otpRecord.id);

    // Check if user exists
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq(otpRecord.type === 'email' ? 'email' : 'phone', identifier)
      .single();

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          [otpRecord.type]: identifier,
          name: name || identifier
        })
        .select()
        .single();

      if (createError) {
        console.error('[auth] user insert error:', createError);
        throw createError;
      }
      user = newUser;
      console.log('[auth] new user created:', user?.id);
    } else if (userError) {
      console.error('[auth] user select error:', userError);
      throw userError;
    } else {
      console.log('[auth] existing user found:', user?.id);
    }

    if (!user?.id) {
      return res.status(500).json({ error: 'Failed to resolve user — please try again' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: { id: user.id, email: user.email, phone: user.phone, name: user.name },
      token
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user — decodes JWT and fetches from DB
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, phone')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
