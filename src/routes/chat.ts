import { Router } from 'express';
import { db } from '../database';
import { ragService } from '../services/ragService';

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

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📨 Chat Request Received`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Question: "${question}"`);
    console.log(`${'─'.repeat(60)}`);

    // Use RAG service to answer the question
    const startTime = Date.now();
    const ragResponse = await ragService.answerQuestion(question, userId);
    const responseTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ Response Generated`);
    console.log(`   Response Time: ${responseTime}s`);
    console.log(`   Confidence: ${(ragResponse.confidence * 100).toFixed(1)}%`);
    console.log(`   Sources: ${ragResponse.sources.length}`);
    console.log(`   Answer Length: ${ragResponse.answer.length} chars`);
    console.log(`${'─'.repeat(60)}\n`);

    // Store the conversation
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
      content: ragResponse.answer,
      created_at: new Date().toISOString(),
    };
    
    messages.push(userMessage, assistantMessage);

    res.json({
      success: true,
      answer: ragResponse.answer,
      confidence: ragResponse.confidence,
      responseTimeSeconds: parseFloat(responseTime),
      sources: ragResponse.sources.map(source => ({
        chunkId: source.chunkId,
        documentId: source.documentId,
        documentTitle: source.documentTitle,
        chunkIndex: source.chunkIndex,
        relevanceScore: source.relevanceScore,
        excerpt: source.chunkText.substring(0, 200) + '...',
        metadata: {
          author: source.metadata?.author,
          documentType: source.metadata?.documentType
        }
      })),
      metadata: {
        sourceCount: ragResponse.sources.length,
        avgRelevanceScore: ragResponse.sources.length > 0 
          ? ragResponse.sources.reduce((sum, s) => sum + s.relevanceScore, 0) / ragResponse.sources.length 
          : 0,
        topRelevanceScore: ragResponse.sources[0]?.relevanceScore || 0
      }
    });

  } catch (error) {
    console.error('\n❌ Error in RAG Q&A:', error);
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
