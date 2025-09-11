import { pool } from "../helper/db.js"
import { Router } from "express"
import jwt from "jsonwebtoken"
import { compare, hash } from "bcrypt"
import dotenv from "dotenv"

dotenv.config()

const sign = jwt.sign
const verify = jwt.verify
const SECRET = process.env.JWT_SECRET

const router = Router()

router.post('/register', (req, res, next) => {
    const { user } = req.body

    if (!user || !user.username || !user.email || !user.password) {
        const error = new Error('Username, email and password are required')
        return next(error)
    }

    hash(user.password, 10, (err, hashedPassword) => {
        if (err) {
            return next(err)
        } 

        pool.query('INSERT INTO users (username, email, password, user_desc) VALUES ($1, $2, $3, $4) RETURNING *',
            [user.username, user.email, hashedPassword, user.user_desc],
            (err, result) => {
                if (err) {
                    return next(err)
                }
                res.status(201).json({ id: result.rows[0].id, email: user.email })
            })
    })
})

router.post('/login', (req, res, next) => {
    const { user } = req.body

    if (!user || !user.email || !user.password) {
        const err = new Error('Your email and password are required')
        err.status = 400
        return next(err)
    }
    pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [user.username, user.email], (err, result) => {
        if (err) {
            return next(err)
        } 

        if (result.rows.length === 0) {
            const error = new Error('User not found')
            error.status = 404
            return next(error)
        }

        const foundUser = result.rows[0]

        compare(user.password, foundUser.password, (err, isMatch) => {
            if (err) {
                return next(err)
            } 

            if (!isMatch) {
                const error = new Error('Invalid password')
                error.status = 401
                return next(error)
            }
            
            const token = sign({ user: foundUser }, process.env.JWT_SECRET, {expiresIn: '1h' })
            res.status(200).json({
                id: foundUser.id,
                username: foundUser.username,
                email: foundUser.email,
                user_desc: foundUser.user_desc,
                token
            })
        })
    })
})


export default router