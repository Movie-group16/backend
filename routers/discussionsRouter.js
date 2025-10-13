import { pool } from '../helper/db.js'
import { Router } from 'express'

const router = Router()

router.get('/:groupId', async (req, res) => {
    const { groupId } = req.params
    try {
        const result = await pool.query(
            `SELECT ds.*, u.username 
             FROM discussion_start ds
             LEFT JOIN users u ON ds.user_id = u.id
             WHERE ds.group_id = $1
             ORDER BY ds.created_at DESC`,
            [groupId]
        )
        res.json(result.rows)
    } catch (error) {
        console.error(error)
        res.status(500).send('Server error')
    }
})

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
    const { discussionId } = req.params
    try {
        const result = await pool.query(
            `SELECT dc.*, u.username 
             FROM discussion_comment dc
             LEFT JOIN users u ON dc.user_id = u.id
             WHERE dc.discussion_start_id = $1
             ORDER BY dc.created_at ASC`,
            [discussionId]
        )
        res.json(result.rows)
    } catch (error) {
        console.error(error)
        res.status(500).send('Server error')
    }
})

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
    const { userId } = req.body 

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' })
    }

    try {
        const existingLike = await pool.query(
            'SELECT like_type FROM discussion_likes WHERE discussion_id = $1 AND user_id = $2',
            [discussionId, userId]
        )

        if (existingLike.rows.length > 0) {
            const currentLikeType = existingLike.rows[0].like_type
            
            if (currentLikeType === 'like') {
                await pool.query(
                    'DELETE FROM discussion_likes WHERE discussion_id = $1 AND user_id = $2',
                    [discussionId, userId]
                )
                await pool.query(
                    'UPDATE discussion_start SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = $1',
                    [discussionId]
                )
                return res.status(200).json({ message: 'Discussion unliked', action: 'unliked' })
            } else {
                await pool.query(
                    'UPDATE discussion_likes SET like_type = $1 WHERE discussion_id = $2 AND user_id = $3',
                    ['like', discussionId, userId]
                )
                await pool.query(
                    'UPDATE discussion_start SET likes = COALESCE(likes, 0) + 1, dislikes = GREATEST(COALESCE(dislikes, 0) - 1, 0) WHERE id = $1',
                    [discussionId]
                )
                return res.status(200).json({ message: 'Discussion liked', action: 'liked' })
            }
        } else {
            await pool.query(
                'INSERT INTO discussion_likes (discussion_id, user_id, like_type) VALUES ($1, $2, $3)',
                [discussionId, userId, 'like']
            )
            await pool.query(
                'UPDATE discussion_start SET likes = COALESCE(likes, 0) + 1 WHERE id = $1',
                [discussionId]
            )
            return res.status(200).json({ message: 'Discussion liked', action: 'liked' })
        }
    } catch (error) {
        console.error('Error updating discussion likes:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

router.put('/discussion/:discussionId/dislike', async (req, res) => {
    const { discussionId } = req.params
    const { userId } = req.body

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' })
    }

    try {
        const existingLike = await pool.query(
            'SELECT like_type FROM discussion_likes WHERE discussion_id = $1 AND user_id = $2',
            [discussionId, userId]
        )

        if (existingLike.rows.length > 0) {
            const currentLikeType = existingLike.rows[0].like_type
            
            if (currentLikeType === 'dislike') {
                await pool.query(
                    'DELETE FROM discussion_likes WHERE discussion_id = $1 AND user_id = $2',
                    [discussionId, userId]
                )
                await pool.query(
                    'UPDATE discussion_start SET dislikes = GREATEST(COALESCE(dislikes, 0) - 1, 0) WHERE id = $1',
                    [discussionId]
                )
                return res.status(200).json({ message: 'Discussion dislike removed', action: 'undisliked' })
            } else {
                await pool.query(
                    'UPDATE discussion_likes SET like_type = $1 WHERE discussion_id = $2 AND user_id = $3',
                    ['dislike', discussionId, userId]
                )
                await pool.query(
                    'UPDATE discussion_start SET dislikes = COALESCE(dislikes, 0) + 1, likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = $1',
                    [discussionId]
                )
                return res.status(200).json({ message: 'Discussion disliked', action: 'disliked' })
            }
        } else {
            await pool.query(
                'INSERT INTO discussion_likes (discussion_id, user_id, like_type) VALUES ($1, $2, $3)',
                [discussionId, userId, 'dislike']
            )
            await pool.query(
                'UPDATE discussion_start SET dislikes = COALESCE(dislikes, 0) + 1 WHERE id = $1',
                [discussionId]
            )
            return res.status(200).json({ message: 'Discussion disliked', action: 'disliked' })
        }
    } catch (error) {
        console.error('Error updating discussion dislikes:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

router.put('/comment/:commentId/like', async (req, res) => {
    const { commentId } = req.params
    const { userId } = req.body

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' })
    }

    try {
        const existingLike = await pool.query(
            'SELECT like_type FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
            [commentId, userId]
        )

        if (existingLike.rows.length > 0) {
            const currentLikeType = existingLike.rows[0].like_type
            
            if (currentLikeType === 'like') {
                await pool.query(
                    'DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
                    [commentId, userId]
                )
                await pool.query(
                    'UPDATE discussion_comment SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = $1',
                    [commentId]
                )
                return res.status(200).json({ message: 'Comment unliked', action: 'unliked' })
            } else {
                await pool.query(
                    'UPDATE comment_likes SET like_type = $1 WHERE comment_id = $2 AND user_id = $3',
                    ['like', commentId, userId]
                )
                await pool.query(
                    'UPDATE discussion_comment SET likes = COALESCE(likes, 0) + 1, dislikes = GREATEST(COALESCE(dislikes, 0) - 1, 0) WHERE id = $1',
                    [commentId]
                )
                return res.status(200).json({ message: 'Comment liked', action: 'liked' })
            }
        } else {
            await pool.query(
                'INSERT INTO comment_likes (comment_id, user_id, like_type) VALUES ($1, $2, $3)',
                [commentId, userId, 'like']
            )
            await pool.query(
                'UPDATE discussion_comment SET likes = COALESCE(likes, 0) + 1 WHERE id = $1',
                [commentId]
            )
            return res.status(200).json({ message: 'Comment liked', action: 'liked' })
        }
    } catch (error) {
        console.error('Error updating comment likes:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

router.put('/comment/:commentId/dislike', async (req, res) => {
    const { commentId } = req.params
    const { userId } = req.body

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' })
    }

    try {
        const existingLike = await pool.query(
            'SELECT like_type FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
            [commentId, userId]
        )

        if (existingLike.rows.length > 0) {
            const currentLikeType = existingLike.rows[0].like_type
            
            if (currentLikeType === 'dislike') {
                await pool.query(
                    'DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
                    [commentId, userId]
                )
                await pool.query(
                    'UPDATE discussion_comment SET dislikes = GREATEST(COALESCE(dislikes, 0) - 1, 0) WHERE id = $1',
                    [commentId]
                )
                return res.status(200).json({ message: 'Comment dislike removed', action: 'undisliked' })
            } else {
                await pool.query(
                    'UPDATE comment_likes SET like_type = $1 WHERE comment_id = $2 AND user_id = $3',
                    ['dislike', commentId, userId]
                )
                await pool.query(
                    'UPDATE discussion_comment SET dislikes = COALESCE(dislikes, 0) + 1, likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = $1',
                    [commentId]
                )
                return res.status(200).json({ message: 'Comment disliked', action: 'disliked' })
            }
        } else {
            await pool.query(
                'INSERT INTO comment_likes (comment_id, user_id, like_type) VALUES ($1, $2, $3)',
                [commentId, userId, 'dislike']
            )
            await pool.query(
                'UPDATE discussion_comment SET dislikes = COALESCE(dislikes, 0) + 1 WHERE id = $1',
                [commentId]
            )
            return res.status(200).json({ message: 'Comment disliked', action: 'disliked' })
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
            'INSERT INTO discussion_start (group_id, user_id, discussion_title, discussion_text, likes, dislikes, created_at) VALUES ($1, $2, $3, $4, 0, 0, current_timestamp) RETURNING *',
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
            'INSERT INTO discussion_comment (discussion_start_id, user_id, comment_text, likes, dislikes, created_at) VALUES ($1, $2, $3, 0, 0, current_timestamp) RETURNING *',
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
            'SELECT user_id FROM discussion_start WHERE id = $1',
            [discussionId]
        )
        
        if (discussionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Discussion not found' })
        }

        const authorId = discussionCheck.rows[0].user_id

        if (authorId != userId) {
            return res.status(403).json({ error: 'You can only delete your own discussions' })
        }

        const commentCount = await pool.query(
            'SELECT COUNT(*) FROM discussion_comment WHERE discussion_start_id = $1',
            [discussionId]
        )

        const result = await pool.query(
            'DELETE FROM discussion_start WHERE id = $1 RETURNING *',
            [discussionId]
        )

        res.status(200).json({
            message: 'Discussion and all associated comments deleted successfully',
            deletedDiscussion: result.rows[0],
            deletedCommentsCount: parseInt(commentCount.rows[0].count)
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
            'SELECT user_id, discussion_start_id FROM discussion_comment WHERE id = $1',
            [commentId]
        )
        
        if (commentCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Comment not found' })
        }

        const { user_id: authorId, discussion_start_id: discussionId } = commentCheck.rows[0]

        if (authorId != userId) {
            return res.status(403).json({ error: 'You can only delete your own comments' })
        }

        const result = await pool.query(
            'DELETE FROM discussion_comment WHERE id = $1 RETURNING *',
            [commentId]
        )

        res.status(200).json({
            message: 'Comment deleted successfully',
            deletedComment: result.rows[0],
            discussionId: discussionId
        })
    } catch (error) {
        console.error('Error deleting comment:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})


export default router