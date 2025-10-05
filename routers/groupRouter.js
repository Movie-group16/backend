import { pool } from '../helper/db.js'
import { Router } from 'express'

const router = Router()

router.get('/', (req, res, next) => {

    pool.query('SELECT * FROM groups', (error, results) => {
        if (error) {
            return next(error)
        }

        res.status(200).json(results.rows)
    })
})

router.get('/:id', (req, res, next) => {
    const { id } = req.params

    pool.query('SELECT * FROM groups WHERE id = $1', [id], (error, results) => {
        if (error) {
            return next(error)
        }

        if (results.rows.length === 0) {
            const error = new Error('Group not found')
            error.status = 404
            return next(error)
        }

        res.status(200).json(results.rows[0])
    })
})

router.get('/memberships', (req, res, next) => {

    pool.query('SELECT username, email, user_desc, group_name, group_desc, group_rules FROM groupUser INNER JOIN users ON groupUser.user_id = users.id INNER JOIN groups ON groupUser.group_id = groups.id', (error, results) => {
        if (error) {
            return next(error)
        }

        res.status(200).json(results.rows)
    })
})

router.post('/', (req, res, next) => {
    const { group } = req.body

    if (!group || !group.group_name || !group.owner_id || !group.group_desc || !group.group_rules) {
        const error = new Error('Group name, owner, group description and group rules are required')
        error.status = 400
        return next(error)
    }

    pool.query('INSERT INTO groups (group_name, owner_id, group_desc, group_rules) VALUES ($1, $2, $3, $4) RETURNING *',
        [group.group_name, group.owner_id, group.group_desc, group.group_rules],
        (err, result) => {
        if (err) {
            if (err.code === '23505') {
                const error = new Error('Group name already exists')
                error.status = 400
                return next(error)
            }
            return next(err)
        }

        res.status(201).json(result.rows[0])
    })
})

router.delete('/:id', (req, res, next) => {
    const { id } = req.params;

    console.log(`Deleting group with id: ${id}`);

    pool.query('DELETE FROM groups WHERE id = $1 RETURNING *', 
        [id], (err, result) => {
        if (err) {
            console.error(err);
            return next(err); 
        }

        if (result.rowCount === 0) {
            const error = new Error('Group not found');
            error.status = 404;
            return next(error);
        }

        res.status(200).json({ id: result.rows[0].id });
    })
})

router.post('/:groupId/members', (req, res, next) => {
    const { groupId } = req.params
    const { userId, isAdmin = false } = req.body

    if (!userId) {
        const error = new Error('User is required')
        error.status = 400
        return next(error)
    }

    pool.query(`INSERT INTO groupUser (user_id, group_id, is_admin) VALUES ($1, $2, $3) RETURNING *`,
        [userId, groupId, isAdmin],
        (err, result) => {
        if (err) {
            return next(err)
        }

        res.status(201).json({ id: result.rows[0].id, userId, groupId, isAdmin })
    })
})

router.delete('/:groupId/members/:userId', (req, res, next) => {
    const { groupId, userId } = req.params

    pool.query( `DELETE FROM groupUser WHERE group_id = $1 AND user_id = $2 RETURNING *`,
        [groupId, userId],
        (err, result) => {
        if (err) {
            return next(err)
        }

        if (result.rowCount === 0) {
            const error = new Error('User not found in this group')
            error.status = 404
            return next(error)
        }

        res.status(200).json({ id: result.rows[0].id });
    })
})

export default router