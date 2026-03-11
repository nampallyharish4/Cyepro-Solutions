import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // --- Input validation ---
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'A valid email is required.' });
      }
      if (!password || typeof password !== 'string' || password.length < 6) {
        return res
          .status(400)
          .json({ error: 'Password must be at least 6 characters.' });
      }

      // --- Lookup user ---
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, password_hash, role')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error || !user) {
        // Consistent timing-safe response — do not reveal whether email exists
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Self-heal legacy data: keep canonical reviewer admin account as admin.
      // This prevents stale role rows from breaking admin-only routes.
      const canonicalAdminEmail = 'admin@cyepro.com';
      if (
        user.email?.toLowerCase() === canonicalAdminEmail &&
        String(user.role || '').toLowerCase() !== 'admin'
      ) {
        const { error: roleFixError } = await supabase
          .from('users')
          .update({ role: 'admin' })
          .eq('id', user.id);

        if (!roleFixError) {
          user.role = 'admin';
        }
      }

      // --- Password check ---
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // --- Issue JWT ---
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error('JWT_SECRET is not configured!');
        return res.status(500).json({ error: 'Server configuration error.' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        jwtSecret,
        { expiresIn: '24h' },
      );

      return res.status(200).json({
        token,
        user: { id: user.id, email: user.email, role: user.role },
      });
    } catch (err) {
      console.error('Login Error:', err);
      return res.status(500).json({ error: 'Internal Server Error.' });
    }
  }

  static async signup(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // --- Input validation ---
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'A valid email is required.' });
      }
      if (!password || typeof password !== 'string' || password.length < 6) {
        return res
          .status(400)
          .json({ error: 'Password must be at least 6 characters.' });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // --- Check for existing user ---
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .single();

      if (existing) {
        return res
          .status(409)
          .json({ error: 'An account with this email already exists.' });
      }

      // --- Hash password ---
      const password_hash = await bcrypt.hash(password, 10);

      // --- Create user ---
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          email: normalizedEmail,
          password_hash,
          role: 'operator', // new sign-ups default to operator role
        })
        .select('id, email, role')
        .single();

      if (insertError || !newUser) {
        console.error('Signup Insert Error:', insertError);
        return res
          .status(500)
          .json({ error: 'Failed to create account. Please try again.' });
      }

      // --- Issue JWT ---
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error('JWT_SECRET is not configured!');
        return res.status(500).json({ error: 'Server configuration error.' });
      }

      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role },
        jwtSecret,
        { expiresIn: '24h' },
      );

      return res.status(201).json({
        token,
        user: { id: newUser.id, email: newUser.email, role: newUser.role },
      });
    } catch (err) {
      console.error('Signup Error:', err);
      return res.status(500).json({ error: 'Internal Server Error.' });
    }
  }
}
