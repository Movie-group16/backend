import { pool } from '../helper/db.js'
import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {

    pool.query('SELECT * FROM groups', (error, results) => {
        if (error) {
            return next(error)
        }

        res.status(200).json(results.rows)
    })

})

router.get('/members', (req, res) => {

    pool.query('SELECT username, email, user_desc, group_name, group_desc, group_rules FROM groupUser INNER JOIN users ON groupUser.user_id = users.id INNER JOIN groups ON groupUser.group_id = groups.id', (error, results) => {
        if (error) {
            return next(error)
        }

        res.status(200).json(results.rows)
    })

})

export default router