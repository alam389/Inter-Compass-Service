import { Router } from 'express';
import { db } from '../database';
import { geminiConfig } from '../config/gemini';

// Simple in-memory chat storage to satisfy frontend while backend DB is WIP
let messages: Array<{
  id: number;
  user_id: number;
  role: 'user' | 'assistant';
  content: string;
  filter_category?: string;
  created_at: string;
}> = [];
let msgSeq = 1;

const router = Router();

router.post('/ask', async (req, res) => {
  try {
    const { question, userId } = req.body;
    
    if (!question || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Question and userId are required'
      });
    }

    // 1. Find relevant documents using simple text search
    const relevantDocs = await db.query(`
      SELECT documentid, documenttitle, documentcontent, 
             ts_rank(to_tsvector('english', documentcontent), plainto_tsquery('english', $1)) as rank
      FROM documents 
      WHERE to_tsvector('english', documentcontent) @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 3
    `, [question]);

    if (relevantDocs.rows.length === 0) {
      return res.json({
        success: true,
        answer: "I couldn't find any relevant information in the documents to answer your question.",
        sources: []
      });
    }

    // 2. Prepare context for Gemini
    const context = relevantDocs.rows.map((doc: any) => 
      `Document: ${doc.documenttitle}\nContent: ${doc.documentcontent.substring(0, 1000)}...`
    ).join('\n\n');
    // 3. Create prompt for Gemini
    const prompt = `Based on the following documents, please answer the user's question. If the answer is not in the documents, say so.

Documents:
${context}

Question: ${question}

Answer:`;

    // 4. Get Gemini response
    const geminiResponse = await geminiConfig.getModel().generateContent(prompt);
    const answer = await geminiResponse.response.text();

    // 5. Store the conversation
    const userMessage = {
      id: msgSeq++,
      user_id: Number(userId),
      role: 'user' as const,
      content: question,
      created_at: new Date().toISOString(),
    };
    
    const assistantMessage = {
      id: msgSeq++,
      user_id: Number(userId),
      role: 'assistant' as const,
      content: answer,
      created_at: new Date().toISOString(),
    };
    
    messages.push(userMessage, assistantMessage);

    res.json({
      success: true,
      answer: answer,
      sources: relevantDocs.rows.map((doc: any) => ({
        documentId: doc.documentid,
        documentTitle: doc.documenttitle,
        relevance: doc.rank
      }))
    });

  } catch (error) {
    console.error('Error in RAG Q&A:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process question',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/chat - create message (with optional citations ignored here)
router.post('/', (req, res) => {
  console.log('Received chat request body:', req.body);
  const { user_id, role, content, filter_category } = req.body || {};
  console.log('Extracted fields:', { user_id, role, content, filter_category });
  
  // More specific validation
  if (user_id === undefined || user_id === null) {
    console.log('Validation failed - user_id is missing');
    return res.status(400).json({ success: false, error: 'Validation failed', message: 'user_id is required' });
  }
  if (!role) {
    console.log('Validation failed - role is missing');
    return res.status(400).json({ success: false, error: 'Validation failed', message: 'role is required' });
  }
  if (!content) {
    console.log('Validation failed - content is missing');
    return res.status(400).json({ success: false, error: 'Validation failed', message: 'content is required' });
  }
  if (role !== 'user' && role !== 'assistant') {
    return res.status(400).json({ success: false, error: 'Invalid role' });
  }
  const created = {
    id: msgSeq++,
    user_id: Number(user_id),
    role,
    content,
    filter_category,
    created_at: new Date().toISOString(),
  };
  messages.push(created);
  return res.status(201).json(created);
});

// GET /api/chat/user/:userId?limit=50
router.get('/user/:userId', (req, res) => {
  const userId = Number(req.params.userId);
  const limit = Number(req.query.limit ?? 50);
  const list = messages.filter(m => m.user_id === userId).slice(-limit);
  return res.json(list);
});

// GET /api/chat/user/:userId/filter/:category
router.get('/user/:userId/filter/:category', (req, res) => {
  const userId = Number(req.params.userId);
  const category = String(req.params.category);
  const list = messages.filter(m => m.user_id === userId && m.filter_category === category);
  return res.json(list);
});

// GET /api/chat/user/:userId/stats
router.get('/user/:userId/stats', (req, res) => {
  const userId = Number(req.params.userId);
  const list = messages.filter(m => m.user_id === userId);
  const stats = {
    total: list.length,
    byRole: list.reduce((acc: Record<string, number>, m) => {
      acc[m.role] = (acc[m.role] || 0) + 1;
      return acc;
    }, {}),
  };
  return res.json(stats);
});

// DELETE /api/chat/:id
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const before = messages.length;
  messages = messages.filter(m => m.id !== id);
  if (messages.length === before) return res.status(404).json({ success: false, error: 'Not found' });
  return res.json({ message: 'Deleted' });
});

// DELETE /api/chat/user/:userId
router.delete('/user/:userId', (req, res) => {
  const userId = Number(req.params.userId);
  const before = messages.length;
  messages = messages.filter(m => m.user_id !== userId);
  const deleted = before - messages.length;
  return res.json({ message: `Deleted ${deleted} messages` });
});

export default router;
