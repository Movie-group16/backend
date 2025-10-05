import { pool } from '../helper/db.js'
import { Router } from 'express'

const router = Router()

router.get('/:groupId', async (req, res) => {
    const { groupId } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM discussion_start WHERE group_id = $1',
            [groupId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

router.get('/discussion/:discussionId', async (req, res) => {
    const { discussionId } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM discussion_start WHERE id = $1',
            [discussionId]
        );
        if (result.rows.length === 0) {
            return res.status(404).send('Discussion not found');
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

router.get('/discussion/:discussionId/comments', async (req, res) => {
    const { discussionId } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM discussion_comment WHERE discussion_start_id = $1',
            [discussionId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

router.get('/comment/:commentId', async (req, res) => {
    const { commentId } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM discussion_comment WHERE id = $1',
            [commentId]
        );
        if (result.rows.length === 0) {
            return res.status(404).send('Comment not found');
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Add these endpoints to your existing routers/discussionsRouter.js

// Like/Unlike a discussion
router.put('/discussion/:discussionId/like', async (req, res) => {
    const { discussionId } = req.params
    const { userId, action } = req.body // action: 'like' or 'unlike'

    if (!userId || !action) {
        return res.status(400).json({ error: 'User ID and action are required' })
    }

    try {
        if (action === 'like') {
            // Add like (increment likes count)
            const result = await pool.query(
                'UPDATE discussion_start SET likes = COALESCE(likes, 0) + 1 WHERE id = $1 RETURNING *',
                [discussionId]
            )
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Discussion not found' })
            }

            res.status(200).json({ 
                message: 'Discussion liked', 
                discussion: result.rows[0] 
            })
        } else if (action === 'unlike') {
            // Remove like (decrement likes count, minimum 0)
            const result = await pool.query(
                'UPDATE discussion_start SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = $1 RETURNING *',
                [discussionId]
            )
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Discussion not found' })
            }

            res.status(200).json({ 
                message: 'Discussion unliked', 
                discussion: result.rows[0] 
            })
        } else {
            return res.status(400).json({ error: 'Invalid action. Use "like" or "unlike"' })
        }
    } catch (error) {
        console.error('Error updating discussion likes:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Dislike/Remove dislike from a discussion
router.put('/discussion/:discussionId/dislike', async (req, res) => {
    const { discussionId } = req.params
    const { userId, action } = req.body // action: 'dislike' or 'undislike'

    if (!userId || !action) {
        return res.status(400).json({ error: 'User ID and action are required' })
    }

    try {
        if (action === 'dislike') {
            // Add dislike (increment dislikes count)
            const result = await pool.query(
                'UPDATE discussion_start SET dislikes = COALESCE(dislikes, 0) + 1 WHERE id = $1 RETURNING *',
                [discussionId]
            )
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Discussion not found' })
            }

            res.status(200).json({ 
                message: 'Discussion disliked', 
                discussion: result.rows[0] 
            })
        } else if (action === 'undislike') {
            // Remove dislike (decrement dislikes count, minimum 0)
            const result = await pool.query(
                'UPDATE discussion_start SET dislikes = GREATEST(COALESCE(dislikes, 0) - 1, 0) WHERE id = $1 RETURNING *',
                [discussionId]
            )
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Discussion not found' })
            }

            res.status(200).json({ 
                message: 'Discussion undisliked', 
                discussion: result.rows[0] 
            })
        } else {
            return res.status(400).json({ error: 'Invalid action. Use "dislike" or "undislike"' })
        }
    } catch (error) {
        console.error('Error updating discussion dislikes:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

router.put('/comment/:commentId/like', async (req, res) => {
    const { commentId } = req.params
    const { userId, action } = req.body // action: 'like' or 'unlike'

    if (!userId || !action) {
        return res.status(400).json({ error: 'User ID and action are required' })
    }

    try {
        if (action === 'like') {
            const result = await pool.query(
                'UPDATE discussion_comment SET likes = COALESCE(likes, 0) + 1 WHERE id = $1 RETURNING *',
                [commentId]
            )
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Comment not found' })
            }

            res.status(200).json({ 
                message: 'Comment liked', 
                comment: result.rows[0] 
            })
        } else if (action === 'unlike') {
            const result = await pool.query(
                'UPDATE discussion_comment SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = $1 RETURNING *',
                [commentId]
            )
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Comment not found' })
            }

            res.status(200).json({ 
                message: 'Comment unliked', 
                comment: result.rows[0] 
            })
        } else {
            return res.status(400).json({ error: 'Invalid action. Use "like" or "unlike"' })
        }
    } catch (error) {
        console.error('Error updating comment likes:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

router.put('/comment/:commentId/dislike', async (req, res) => {
    const { commentId } = req.params
    const { userId, action } = req.body 

    if (!userId || !action) {
        return res.status(400).json({ error: 'User ID and action are required' })
    }

    try {
        if (action === 'dislike') {
            const result = await pool.query(
                'UPDATE discussion_comment SET dislikes = COALESCE(dislikes, 0) + 1 WHERE id = $1 RETURNING *',
                [commentId]
            )
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Comment not found' })
            }

            res.status(200).json({ 
                message: 'Comment disliked', 
                comment: result.rows[0] 
            })
        } else if (action === 'undislike') {
            const result = await pool.query(
                'UPDATE discussion_comment SET dislikes = GREATEST(COALESCE(dislikes, 0) - 1, 0) WHERE id = $1 RETURNING *',
                [commentId]
            )
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Comment not found' })
            }

            res.status(200).json({ 
                message: 'Comment undisliked', 
                comment: result.rows[0] 
            })
        } else {
            return res.status(400).json({ error: 'Invalid action. Use "dislike" or "undislike"' })
        }
    } catch (error) {
        console.error('Error updating comment dislikes:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

export default router