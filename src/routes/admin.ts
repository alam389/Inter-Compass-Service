import { Router } from 'express';
import { db } from '../database';

const router = Router();

// Admin routes will be added here
router.get('/', (req, res) => {
  res.json({ message: 'Admin routes' });
});

router.get('/tags', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tags');
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tags',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/documents', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT d.documentid, d.documenttitle, d.documentcontent, t.tagname
       FROM documents d
       LEFT JOIN tags t ON d.tagid = t.tagid`
    );
    // Format the response to nest the tag info under each document
    const documents = result.rows.map((row: any) => {
      // Extract tag fields (assuming tagid, tagname, etc. are columns in tags)
      const {
        documentid, documenttitle, documentcontent, tagid,
        tagname, ...rest
      } = row;
      // All tag columns start after document columns
      const tag = tagid ? { tagid, tagname, ...rest } : null;
      return {
        documentid,
        documenttitle,
        documentcontent,
        tagid,
        tag,
      };
    });
    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error('Error fetching documents with tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


    
router.post('/documents', async (req, res) => {
  try {
    const { documenttitle, documentcontent, tagid} = req.body;
    const result = await db.query('INSERT INTO documents (documenttitle, documentcontent, tagid) VALUES ($1, $2, $3) RETURNING *', [documenttitle, documentcontent, tagid]);
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
export default router;
