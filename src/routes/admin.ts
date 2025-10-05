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
      `SELECT d.documentid, d.documenttitle, d.documentcontent, d.uploadedat, t.tagtype
       FROM documents d
       LEFT JOIN tags t ON d.tagid = t.tagid`
    );
    // Format the response to nest the tag info under each document
    const documents = result.rows.map((row: any) => {
      // Extract tag fields (assuming tagid, tagname, etc. are columns in tags)
      const {
        documentid, documenttitle, documentcontent, uploadedat, tagid,
        tagtype, ...rest
      } = row;
      // All tag columns start after document columns
      const tag = tagid ? { tagid, tagtype, ...rest } : null;
      return {
        documentid,
        documenttitle,
        documentcontent,
        uploadedat,
        tagtype,
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

router.delete('/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM documents WHERE documentid = $1 RETURNING *', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Document deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
