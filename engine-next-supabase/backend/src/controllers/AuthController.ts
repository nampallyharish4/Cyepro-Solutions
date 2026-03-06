import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET as string,
        { expiresIn: '24h' }
      );

      return res.status(200).json({ token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
      console.error('Login Error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
