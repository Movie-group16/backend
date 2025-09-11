import { pool } from '../helper/db.js'
import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {

    pool.query('SELECT * FROM reviews', (error, results) => {
        if (error) {
            return next(error)
        }

        res.status(200).json(results.rows)
    })

})

export default router