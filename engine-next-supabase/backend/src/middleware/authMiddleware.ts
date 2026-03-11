import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../utils/supabaseClient';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

function normalizeRole(role: unknown): string {
  return String(role || '')
    .trim()
    .toLowerCase();
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    req.user = {
      id: String(decoded?.id || ''),
      email: String(decoded?.email || ''),
      role: normalizeRole(decoded?.role),
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function adminOnly(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const tokenRole = normalizeRole(req.user.role);
  if (tokenRole === 'admin') {
    return next();
  }

  // Backward compatibility: older tokens may not carry role properly.
  // Verify role from DB using id/email before denying access.
  const userId = req.user.id;
  const userEmail = req.user.email;

  let roleFromDb = '';

  if (userId) {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    roleFromDb = normalizeRole(data?.role);
  }

  if (!roleFromDb && userEmail) {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('email', userEmail.toLowerCase())
      .maybeSingle();
    roleFromDb = normalizeRole(data?.role);
  }

  if (roleFromDb === 'admin') {
    req.user.role = 'admin';
    return next();
  }

  return res.status(403).json({ error: 'Admin access required' });
}
