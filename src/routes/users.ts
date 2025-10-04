import { Router } from 'express';

// Simple in-memory store as a placeholder until DB routes exist
let users: Array<{
  id: number;
  auth0_id: string;
  email: string;
  name?: string;
  role?: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}> = [];
let idSeq = 1;

const router = Router();

// POST /api/users (create or update)
router.post('/', (req, res) => {
  const { auth0_id, email, name, role } = req.body || {};
  if (!auth0_id || !email) {
    return res.status(400).json({ success: false, error: "Validation failed", message: 'auth0_id and email are required' });
  }

  const now = new Date().toISOString();
  let existing = users.find(u => u.auth0_id === auth0_id || u.email === email);
  if (existing) {
    existing.name = name ?? existing.name;
    existing.role = role ?? existing.role ?? 'user';
    existing.updated_at = now;
    return res.json(existing);
  }

  const created = {
    id: idSeq++,
    auth0_id,
    email,
    name,
    role: role ?? 'user',
    created_at: now,
    updated_at: now,
  };
  users.push(created);
  return res.status(201).json(created);
});

// GET /api/users
router.get('/', (_req, res) => {
  return res.json(users);
});

// GET /api/users/auth0/:id
router.get('/auth0/:id', (req, res) => {
  const u = users.find(x => x.auth0_id === req.params.id);
  if (!u) return res.status(404).json({ success: false, error: 'Not found' });
  return res.json(u);
});

// GET /api/users/email/:email
router.get('/email/:email', (req, res) => {
  const u = users.find(x => x.email === req.params.email);
  if (!u) return res.status(404).json({ success: false, error: 'Not found' });
  return res.json(u);
});

// PATCH /api/users/:id/role
router.patch('/:id/role', (req, res) => {
  const id = Number(req.params.id);
  const { role } = req.body || {};
  if (role !== 'user' && role !== 'admin') {
    return res.status(400).json({ success: false, error: 'Invalid role' });
  }
  const u = users.find(x => x.id === id);
  if (!u) return res.status(404).json({ success: false, error: 'Not found' });
  u.role = role;
  u.updated_at = new Date().toISOString();
  return res.json(u);
});

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const before = users.length;
  users = users.filter(x => x.id !== id);
  if (users.length === before) return res.status(404).json({ success: false, error: 'Not found' });
  return res.json({ message: 'Deleted' });
});

export default router;
