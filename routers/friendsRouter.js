import { pool } from "../helper/db.js"
import { Router } from "express"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import { auth } from "../helper/auth.js"

dotenv.config()

const router = Router()

// auth middleware to protect routes
// router.use(auth)

// get friends list
router.get('/', async (req, res) => {
    const { userId } = req.query

    try {
        const result = await pool.query(
            `SELECT u.id, u.username, u.email, u.user_desc, f.created_at as friends_since
             FROM friends f
             JOIN users u ON f.friend_id = u.id
             WHERE f.user_id = $1 AND f.status = $2
             ORDER BY f.created_at DESC`,
            [userId, 'friends'] 
        )

        res.status(200).json({ friends: result.rows })
    } catch (error) {
        console.error("Error fetching friends:", error)
        res.status(500).json({ error: "Internal server error" })
    }
})

// Get incoming friend requests (requests received by user)
router.get('/requests', async (req, res) => {
    const { userId } = req.query

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' })
    }

    try {
        const result = await pool.query(
            `SELECT u.id, u.username, u.email, f.created_at as requested_at
             FROM friends f
             JOIN users u ON f.user_id = u.id
             WHERE f.friend_id = $1 AND f.status = $2
             ORDER BY f.created_at DESC`,
            [userId, 'pending']
        )

        res.status(200).json({ 
            requests: result.rows,
            count: result.rows.length 
        })
    } catch (error) {
        console.error("Error fetching received friend requests:", error)
        res.status(500).json({ error: "Internal server error" })
    }
})

// Get outgoing friend requests (requests sent by user)
router.get('/sent', async (req, res) => {
    const { userId } = req.query

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' })
    }

    try {
        const result = await pool.query(
            `SELECT u.id, u.username, u.email, f.created_at as sent_at
             FROM friends f
             JOIN users u ON f.friend_id = u.id
             WHERE f.user_id = $1 AND f.status = $2
             ORDER BY f.created_at DESC`,
            [userId, 'pending']
        )

        res.status(200).json({ 
            sent_requests: result.rows,
            count: result.rows.length 
        })
    } catch (error) {
        console.error("Error fetching sent friend requests:", error)
        res.status(500).json({ error: "Internal server error" })
    }
})

// get status of friendship with a specific user
router.get('/status/:friendId', async (req, res) => {
    const { userId } = req.query
    const friendId = parseInt(req.params.friendId)

    if (!userId || !friendId) {
        return res.status(400).json({ error: 'User ID and Friend ID are required' })
    }

    try {
        const result = await pool.query(
            `SELECT status, user_id, friend_id, created_at 
             FROM friends 
             WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
             AND status != 'not_friends'
             ORDER BY created_at DESC`,
            [userId, friendId]
        )

        if (result.rows.length === 0) {
            return res.status(200).json({ 
                status: 'not_friends',
                message: 'No friendship relationship exists'
            })
        }

        const relationships = result.rows
        
        const friendship = relationships.find(rel => rel.status === 'friends')
        if (friendship) {
            return res.status(200).json({
                status: 'friends',
                message: 'Users are friends',
                since: friendship.created_at
            })
        }

        const pendingRequest = relationships.find(rel => rel.status === 'pending')
        if (pendingRequest) {
            if (pendingRequest.user_id == userId) {
                return res.status(200).json({
                    status: 'pending',
                    message: 'Friend request sent, awaiting their approval',
                    sent_at: pendingRequest.created_at
                })
            } else {
                return res.status(200).json({
                    status: 'awaiting',
                    message: 'Friend request received, awaiting your approval',
                    received_at: pendingRequest.created_at
                })
            }
        }

        return res.status(200).json({ 
            status: 'not_friends',
            message: 'No friendship relationship exists'
        })

    } catch (error) {
        console.error("Error checking friendship status:", error)
        res.status(500).json({ error: "Internal server error" })
    }
})

// send friend request 
router.post('/request', async (req, res) => { 
    const { userId, friendId } = req.body

    if (!userId || !friendId) {
        return res.status(400).json({ error: 'User ID and Friend ID are required' })
    }

    if (parseInt(userId) === parseInt(friendId)) {
        return res.status(400).json({ error: 'Cannot send friend request to yourself' })
    }

    try {
        const existingResult = await pool.query(
            'SELECT * FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)', 
            [userId, friendId]
        )

        if (existingResult.rows.length > 0) {
            const existing = existingResult.rows[0]
            if (existing.status === 'not_friends') {
            await pool.query(
                'UPDATE friends SET status = $1, updated_at = current_timestamp WHERE (user_id = $2 AND friend_id = $3) OR (user_id = $3 AND friend_id = $2)',
                ['pending', userId, friendId]
            )
            return res.status(200).json({ message: 'Friend request sent' })
            }
        }

        if (existingResult.rows.length > 0) {
            const existing = existingResult.rows[0]
            if (existing.status === 'pending') {
                return res.status(409).json({ error: 'Friend request already pending' })
            } else if (existing.status === 'friends') {
                return res.status(409).json({ error: 'Users are already friends' })
            }
        }

        const result = await pool.query(
            'INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, $3) RETURNING *',
            [userId, friendId, 'pending']
        )

        res.status(201).json({ 
            message: 'Friend request sent', 
            request: result.rows[0] 
        })
    } catch (error) {
        console.error("Error sending friend request:", error)
        res.status(500).json({ error: "Internal server error" })
    }
})

// accept friend request
router.put('/accept/:friendId', async (req, res) => {
    const { userId } = req.body
    const friendId = parseInt(req.params.friendId)

    try {
        const requestCheck = await pool.query(
            'SELECT * FROM friends WHERE user_id = $1 AND friend_id = $2 AND status = $3',
            [friendId, userId, 'pending']
        )
        
        if (requestCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Friend request not found' })
        }

        await pool.query(
            'UPDATE friends SET status = $1, updated_at = current_timestamp WHERE user_id = $2 AND friend_id = $3',
            ['friends', friendId, userId]
        )
        
        await pool.query(
            'INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, $3)',
            [userId, friendId, 'friends']
        )
        
        res.status(200).json({ message: 'Friend request accepted' })
    } catch (error) {
        console.error("Error accepting friend request:", error)
        res.status(500).json({ error: "Internal server error" })
    }
})

// reject friend request
router.put('/reject/:friendId', async (req, res) => {
    const { userId } = req.body
    const friendId = parseInt(req.params.friendId)

    try {
        const result = await pool.query(
            'DELETE FROM friends WHERE user_id = $1 AND friend_id = $2 AND status = $3',
            [friendId, userId, 'pending']
        )
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Friend request not found' })
        }

        res.status(200).json({ message: 'Friend request rejected' })
    } catch (error) {
        console.error("Error rejecting friend request:", error)
        res.status(500).json({ error: "Internal server error" })
    }
})

// cancel sent friend request
router.put('/cancel/:friendId', async (req, res) => {
    const { userId } = req.body
    const friendId = parseInt(req.params.friendId)

    if (!userId || !friendId) {
        return res.status(400).json({ error: 'User ID and Friend ID are required' })
    }

    if (parseInt(userId) === parseInt(friendId)) {
        return res.status(400).json({ error: 'Invalid operation' })
    }

    try {
        const result = await pool.query(
            'DELETE FROM friends WHERE user_id = $1 AND friend_id = $2 AND status = $3',
            [userId, friendId, 'pending']
        )
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Friend request not found or already processed' })
        }

        res.status(200).json({ message: 'Friend request cancelled' })
    } catch (error) {
        console.error("Error cancelling friend request:", error)
        res.status(500).json({ error: "Internal server error" })
    }
})

// remove friend - Fix HTTP method
router.delete('/remove/:friendId', async (req, res) => { 
    const { userId } = req.body 
    const friendId = parseInt(req.params.friendId)

    if (!userId || !friendId) {
        return res.status(400).json({ error: 'User ID and Friend ID are required' })
    }

    try {
        const result = await pool.query(
            'DELETE FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
            [userId, friendId]
        )

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Friendship not found' })
        }

        res.status(200).json({ message: 'Friend removed' })
    } catch (error) {
        console.error("Error removing friend:", error)
        res.status(500).json({ error: "Internal server error" })
    }
})

export default router