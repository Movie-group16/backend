import fs from 'fs'
import path from 'path'
import { pool } from './db.js'
import jwt from 'jsonwebtoken'
import { hash } from 'bcrypt'

const __dirname = import.meta.dirname

const initializeTestDb = () => {
    const sql = fs.readFileSync(path.resolve(__dirname, '../init.sql'), 'utf8')

    pool.query(sql, (err) => {
        if (err) {
            console.error('Error initializing test database:', err)
        } else {
            console.log('Test database initialized successfully')
        }
    })
}

const insertTestUser = (user) => {
    hash(user.password_hash, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Error hashing password:', err)
            return
        }
        pool.query('INSERT INTO users (username, email, password_hash, user_desc) VALUES ($1, $2, $3, $4)',
            [user.username, user.email, hashedPassword, user.user_desc],
            (err, result) => {
                if (err) {
                    console.error('Error inserting test user:', err)
                } else {
                    console.log('Test user inserted successfully')
            }
        })
    })
}

const getToken = (email) => {
    return jwt.sign({ email }, process.env.JWT_SECRET)
}

export { initializeTestDb, insertTestUser, getToken }