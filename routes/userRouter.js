import { pool } from "../helper/db.js"
import { Router } from "express"
import jwt from "jsonwebtoken"
import { compare, hash } from "bcrypt"


const sign = jwt.sign
const verify = jwt.verify
const SECRET = process.env.JWT_SECRET

const router = Router()

router.post('/register', (req, res) => {
    const { user} = req.body


    if(!user || !user.username || !user.email || !user.password) {
        const error = new Error('Username, email and password are required')
        error.status = 400
        return next(error)
    }

    hash(user.password, 10, (err, hashedPassword) => {
        if (err) {
            return next(err)   
        }

        pool.query('INSERT INTO users (username, email, password, user_desc) VALUES ($1, $2, $3, $4) RETURNING *', 
            [user.username, user.email, hashedPassword, user.user_desc], (error, results) => {

            if (error) return next(error)

            const newUser = results.rows[0]
            const token = sign({ id: newUser.id, username: newUser.username }, SECRET, { expiresIn: '1h' })
            res.status(201).json({ user: newUser, token })
        })
    })

})

router.post('/login', (req, res) => {
    const { user } = req.body

    pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [user.username, user.email], (error, results) => {
        if (error) {
            return next(error)
        }

        if(results.rows.length === 0) {
            const err = new Error('No user found with the given username or email')
            err.status = 404
            return next(err)
        }

        const foundUser = results.rows[0]

        compare(user.password, foundUser.password, (err, isMatch) => {
            if (err) {
                return next(err)
            }

            if (!isMatch) {
                const error = new Error('Invalid password')
                error.status = 401
                return next(error)
            }
        })

        const token = sign({user: foundUser}, process.env.JWT_SECRET, { expiresIn: '1h' })

        res.status(200).json(
            {
                id: foundUser.id,
                username: foundUser.username,
                email: foundUser.email,
                user_desc: foundUser.user_desc,
                token
            }
        )
    })
})

router.get('/', (req, res) => {

    pool.query('SELECT * FROM users', (error, results) => {
        if (error) {
            return next(error)
        }

        res.status(200).json(results.rows)
    })

})

export default router