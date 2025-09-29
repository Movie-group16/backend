import { pool } from "../helper/db.js"
import { Router } from "express"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

const router = Router()

router.post('/request', async (req, res) => {
    const { userId, friendId } = req.body

    if (!userId || !friendId) {
        return res.status(400).json({ error: 'User ID and Friend ID are required' })
    }

    try {
        const existingResult = await pool.query(
            'SELECT * FROM friends WHERE user_id = $1 AND friend_id = $2', 
            [userId, friendId]
        )

        if (existingResult.rows.length > 0) {
            return res.status(409).json({ error: 'Friend request already exists' })
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

router.get('/', async (req, res) => {
    const { userId } = req.query

    try {
        const result = await pool.query(
            `SELECT u.id, u.username, u.email, u.user_desc, f.created_at as friends_since
             FROM friends f
             JOIN users u ON f.friend_id = u.id
             WHERE f.user_id = $1 AND f.status = $2
             ORDER BY f.created_at DESC`,
            [userId, 'accepted']
        )

        res.status(200).json({ friends: result.rows })
    } catch (error) {
        console.error("Error fetching friends:", error)
        res.status(500).json({ error: "Internal server error" })
    }
})

router.get('/requests', async (req, res) => {
    const { userId } = req.query

    try {
        const result = await pool.query(
            `SELECT u.id, u.username, u.email, f.created_at as requested_at
             FROM friends f
             JOIN users u ON f.user_id = u.id
             WHERE f.friend_id = $1 AND f.status = $2
             ORDER BY f.created_at DESC`,
            [userId, 'pending']
        )

        res.status(200).json({ requests: result.rows })
    } catch (error) {
        console.error("Error fetching friend requests:", error)
        res.status(500).json({ error: "Internal server error" })
    }
})

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
        
        const acceptedFriendship = relationships.find(rel => rel.status === 'accepted')
        if (acceptedFriendship) {
            return res.status(200).json({
                status: 'friends',
                message: 'Users are friends',
                since: acceptedFriendship.created_at
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

        const rejectedRequest = relationships.find(rel => rel.status === 'rejected')
        if (rejectedRequest) {
            return res.status(200).json({
                status: 'rejected',
                message: 'Friend request was rejected',
                rejected_at: rejectedRequest.updated_at || rejectedRequest.created_at
            })
        }

    } catch (error) {
        console.error("Error checking friendship status:", error)
        res.status(500).json({ error: "Internal server error" })
    }
})

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
            ['accepted', friendId, userId]
        )
        await pool.query(
            'INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, $3)',
            [userId, friendId, 'accepted']
        )
        res.status(200).json({ message: 'Friend request accepted' })
    } catch (error) {
        console.error("Error accepting friend request:", error)
        res.status(500).json({ error: "Internal server error" })
    }
})


router.put('/reject/:friendId', async (req, res) => {
    const { userId } = req.body
    const friendId = parseInt(req.params.friendId)

    try {
        const result = await pool.query(
            'UPDATE friends SET status = $1, updated_at = current_timestamp WHERE user_id = $2 AND friend_id = $3 AND status = $4',
            ['rejected', friendId, userId, 'pending']
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

router.delete('/remove/:friendId', async (req, res) => {
    const { userId } = req.body
    const friendId = parseInt(req.params.friendId)

    try {
        await pool.query(
            'DELETE FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
            [userId, friendId]
        )

        res.status(200).json({ message: 'Friend removed' })
    } catch (error) {
        console.error("Error removing friend:", error)
        res.status(500).json({ error: "Internal server error" })
    }
})

export default router
