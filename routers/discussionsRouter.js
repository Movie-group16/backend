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

router.put('/discussion/:discussionId/like', async (req, res) => {
    const { discussionId } = req.params
    const { userId, action } = req.body 

    if (!userId || !action) {
        return res.status(400).json({ error: 'User ID and action are required' })
    }

    try {
        if (action === 'like') {
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

router.put('/discussion/:discussionId/dislike', async (req, res) => {
    const { discussionId } = req.params
    const { userId, action } = req.body 

    if (!userId || !action) {
        return res.status(400).json({ error: 'User ID and action are required' })
    }

    try {
        if (action === 'dislike') {
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
    const { userId, action } = req.body 

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

router.post('/discussion/create', async (req, res) => {
    const { group_id, user_id, discussion_title, discussion_text } = req.body

    if (!user_id || !group_id || !discussion_title || !discussion_text) {
        return res.status(400).json({ error: 'User ID, group ID, discussion title, and discussion text are required' })
    }

    try {
        const groupCheck = await pool.query('SELECT id FROM groups WHERE id = $1', [group_id])
        if (groupCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Group not found' })
        }

        // const memberCheck = await pool.query(
        //     'SELECT * FROM groupUser WHERE user_id = $1 AND group_id = $2',
        //     [user_id, group_id]
        // )
        // if (memberCheck.rows.length === 0) {
        //     return res.status(403).json({ error: 'You must be a member of this group to create discussions' })
        // }

        const result = await pool.query(
            'INSERT INTO discussion_start (group_id, user_id, discussion_title, discussion_text, likes, dislikes) VALUES ($1, $2, $3, $4, 0, 0) RETURNING *',
            [group_id, user_id, discussion_title, discussion_text]
        )

        res.status(201).json({
            message: 'Discussion created successfully',
            discussion: result.rows[0]
        })
    } catch (error) {
        console.error('Error creating discussion:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

router.post('/comment/create', async (req, res) => {
    const { discussion_id, userId, comment_text } = req.body

    if (!userId || !discussion_id || !comment_text) {
        return res.status(400).json({ error: 'User ID, discussion ID, and comment text are required' })
    }

    try {
        const discussionCheck = await pool.query(
            'SELECT id FROM discussion_start WHERE id = $1',
            [discussion_id]
        )
        
        if (discussionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Discussion not found' })
        }

        const result = await pool.query(
            'INSERT INTO discussion_comment (discussion_start_id, user_id, comment_text, likes, dislikes) VALUES ($1, $2, $3, 0, 0) RETURNING *',
            [discussion_id, userId, comment_text]
        )

        res.status(201).json({
            message: 'Comment added successfully',
            comment: result.rows[0]
        })
    } catch (error) {
        console.error('Error adding comment:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

router.delete('/discussion/:discussionId', async (req, res) => {
    const { discussionId } = req.params
    const { userId } = req.body

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' })
    }

    try {
        const discussionCheck = await pool.query(
            'SELECT user_id, group_id FROM discussion_start WHERE id = $1',
            [discussionId]
        )
        
        if (discussionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Discussion not found' })
        }

        const { user_id: authorId, group_id: groupId } = discussionCheck.rows[0]

        const isAuthor = authorId == userId
        const adminCheck = await pool.query(
            'SELECT is_admin FROM groupUser WHERE user_id = $1 AND group_id = $2',
            [userId, groupId]
        )
        const isAdmin = adminCheck.rows.length > 0 && adminCheck.rows[0].is_admin

        if (!isAuthor && !isAdmin) {
            return res.status(403).json({ error: 'You can only delete your own discussions or you must be a group admin' })
        }

        const result = await pool.query(
            'DELETE FROM discussion_start WHERE id = $1 RETURNING *',
            [discussionId]
        )

        res.status(200).json({
            message: 'Discussion deleted successfully',
            deletedDiscussion: result.rows[0]
        })
    } catch (error) {
        console.error('Error deleting discussion:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

router.delete('/comment/:commentId', async (req, res) => {
    const { commentId } = req.params
    const { userId } = req.body

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' })
    }

    try {
        const commentCheck = await pool.query(
            `SELECT dc.user_id, ds.group_id 
             FROM discussion_comment dc
             JOIN discussion_start ds ON dc.discussion_start_id = ds.id
             WHERE dc.id = $1`,
            [commentId]
        )
        
        if (commentCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Comment not found' })
        }

        const { user_id: authorId, group_id: groupId } = commentCheck.rows[0]

        const isAuthor = authorId == userId
        const adminCheck = await pool.query(
            'SELECT is_admin FROM groupUser WHERE user_id = $1 AND group_id = $2',
            [userId, groupId]
        )
        const isAdmin = adminCheck.rows.length > 0 && adminCheck.rows[0].is_admin

        if (!isAuthor && !isAdmin) {
            return res.status(403).json({ error: 'You can only delete your own comments or you must be a group admin' })
        }

        const result = await pool.query(
            'DELETE FROM discussion_comment WHERE id = $1 RETURNING *',
            [commentId]
        )

        res.status(200).json({
            message: 'Comment deleted successfully',
            deletedComment: result.rows[0]
        })
    } catch (error) {
        console.error('Error deleting comment:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

export default router