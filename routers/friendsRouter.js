import { pool } from "../helper/db.js"
import { Router } from "express"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

const verify = jwt.verify
const SECRET = process.env.JWT_SECRET

const router = Router()

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    
    if (!token) {
        const error = new Error('No token provided')
        error.status = 401
        return next(error)
    }
    
    verify(token, SECRET, (err, decoded) => {
        if (err) {
            const error = new Error('Failed to authenticate token')
            error.status = 401
            return next(error)
        }
        req.user = decoded.user
        next()
    })
}

router.use(authMiddleware)

router.post('/request', (req, res, next) => {
    const { friendId } = req.body
    const userId = req.user.id

    if (!friendId) {
        const error = new Error('Friend ID is required')
        error.status = 400
        return next(error)
    }

    pool.query('SELECT * FROM friends WHERE user_id = $1 AND friend_id = $2', 
        [userId, friendId], (error, result) => {
        if (error) {
            return next(error)
        }

        if (result.rows.length > 0) {
            const error = new Error('Friend request already exists')
            error.status = 409
            return next(error)
        }

        pool.query('INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, $3) RETURNING *',
            [userId, friendId, 'pending'], (error, result) => {
            if (error) {
                return next(error)
            }

            res.status(201).json({ 
                message: 'Friend request sent', 
                request: result.rows[0] 
            })
        })
    })
})

router.put('/accept/:friendId', (req, res, next) => {
    const friendId = parseInt(req.params.friendId)
    const userId = req.user.id

    pool.query('UPDATE friends SET status = $1, updated_at = current_timestamp WHERE user_id = $2 AND friend_id = $3 AND status = $4',
        ['accepted', friendId, userId, 'pending'], (error, result) => {
        if (error) {
            return next(error)
        }

        if (result.rowCount === 0) {
            const error = new Error('Friend request not found')
            error.status = 404
            return next(error)
        }

        pool.query('INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, $3) ON CONFLICT (user_id, friend_id) DO NOTHING',
            [userId, friendId, 'accepted'], (error, result) => {
            if (error) {
                return next(error)
            }

            res.status(200).json({ message: 'Friend request accepted' })
        })
    })
})

router.get('/', (req, res, next) => {
    const userId = req.user.id

    pool.query(`SELECT u.id, u.username, u.email, u.user_desc, f.created_at as friends_since
                FROM friends f
                JOIN users u ON f.friend_id = u.id
                WHERE f.user_id = $1 AND f.status = $2
                ORDER BY f.created_at DESC`,
        [userId, 'accepted'], (error, result) => {
        if (error) {
            return next(error)
        }

        res.status(200).json({ friends: result.rows })
    })
})

router.get('/requests', (req, res, next) => {
    const userId = req.user.id

    pool.query(`SELECT u.id, u.username, u.email, f.created_at as requested_at
                FROM friends f
                JOIN users u ON f.user_id = u.id
                WHERE f.friend_id = $1 AND f.status = $2
                ORDER BY f.created_at DESC`,
        [userId, 'pending'], (error, result) => {
        if (error) {
            return next(error)
        }

        res.status(200).json({ requests: result.rows })
    })
})

router.put('/reject/:friendId', (req, res, next) => {
    const friendId = parseInt(req.params.friendId)
    const userId = req.user.id

    pool.query('UPDATE friends SET status = $1, updated_at = current_timestamp WHERE user_id = $2 AND friend_id = $3 AND status = $4',
        ['rejected', friendId, userId, 'pending'], (error, result) => {
        if (error) {
            return next(error)
        }

        if (result.rowCount === 0) {
            const error = new Error('Friend request not found')
            error.status = 404
            return next(error)
        }

        res.status(200).json({ message: 'Friend request rejected' })
    })
})

router.delete('/:friendId', (req, res, next) => {
    const friendId = parseInt(req.params.friendId)
    const userId = req.user.id

    pool.query('DELETE FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
        [userId, friendId], (error, result) => {
        if (error) {
            return next(error)
        }

        res.status(200).json({ message: 'Friend removed' })
    })
})

export default router