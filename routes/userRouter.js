import { pool } from "../helper/db.js"
import { Router } from "express"
import jwt from "jsonwebtoken"
import { compare, hash } from "bcrypt"


const sign = jwt.sign
const verify = jwt.verify
const SECRET = process.env.JWT_SECRET

const router = Router()

//register and login things here

router.get('/', (req, res) => {

    pool.query('SELECT * FROM users', (error, results) => {
        if (error) {
            return next(error)
        }

        res.status(200).json(results.rows)
    })

})

export default router