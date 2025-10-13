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

router.get('/memberships', (req, res, next) => {
  pool.query(`
    SELECT 
      gu.user_id, 
      gu.group_id, 
      gu.status,
      gu.is_admin,
      u.username, 
      u.email, 
      u.user_desc, 
      g.id AS group_id,
      g.owner_id,
      g.group_name, 
      g.group_desc, 
      g.group_rules
    FROM groupuser AS gu
    INNER JOIN users AS u ON gu.user_id = u.id
    INNER JOIN groups AS g ON gu.group_id = g.id
  `, (error, results) => {
    if (error) {
      console.error('Error fetching memberships:', error)
      return res.status(500).json({ error: error.message })
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

        const createdGroup = result.rows[0]

        pool.query(
            'INSERT INTO groupUser (user_id, group_id, is_admin, status) VALUES ($1, $2, $3, $4)',
            [group.owner_id, createdGroup.id, true, 'member'],
            (err2) => {
                if (err2) return next(err2)

                res.status(201).json(createdGroup)
         })
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
  const { groupId } = req.params;
  const { userId, isAdmin = false, status = 'pending' } = req.body;

  const uid = Number(userId);
  const gid = Number(groupId);

  if (!uid || !gid) {
    return res.status(400).json({ error: 'Invalid userId or groupId' });
  }

  const query = `
    INSERT INTO groupUser (user_id, group_id, is_admin, status)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, group_id) 
    DO UPDATE SET status = EXCLUDED.status
    RETURNING *
  `;

  pool.query(query, [uid, gid, isAdmin, status], (err, result) => {
    if (err) {
      console.error('Database error on join request:', err);
      return res.status(500).json({ error: 'Failed to send join request', details: err.message });
    }
    res.status(201).json(result.rows[0]);
  });
});

router.put('/:groupId/members/:userId/approve', (req, res, next) => {
  const { groupId, userId } = req.params

  pool.query(
    `UPDATE groupUser SET status = 'member'
     WHERE group_id = $1 AND user_id = $2 AND status = 'pending'
     RETURNING *`,
    [groupId, userId],
    (err, result) => {
      if (err) return next(err)
      if (result.rowCount === 0) {
        const error = new Error('No pending request found')
        error.status = 404
        return next(error)
      }
      res.status(200).json(result.rows[0])
    }
  )
})

router.put('/:groupId/members/:userId/reject', (req, res, next) => {
  const { groupId, userId } = req.params

  pool.query(
    `DELETE FROM groupUser
     WHERE group_id = $1 AND user_id = $2 AND status = 'pending'
     RETURNING *`,
    [groupId, userId],
    (err, result) => {
      if (err) return next(err)
      if (result.rowCount === 0) {
        const error = new Error('No pending request found')
        error.status = 404
        return next(error)
      }
      res.status(200).json({ message: 'Join request rejected' })
    }
  )
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

router.delete('/:groupId/leave', (req, res, next) => {
    const { groupId } = req.params
    const { userId } = req.body

    if (!userId) {
        const error = new Error('User ID is required')
        error.status = 400
        return next(error)
    }

    pool.query('SELECT owner_id FROM groups WHERE id = $1', [groupId], (err, groupResult) => {
        if (err) {
            return next(err)
        }

        if (groupResult.rows.length === 0) {
            const error = new Error('Group not found')
            error.status = 404
            return next(error)
        }

        if (groupResult.rows[0].owner_id == userId) {
            const error = new Error('Group owners cannot leave their own group. Transfer ownership or delete the group instead.')
            error.status = 403
            return next(error)
        }

        pool.query('DELETE FROM groupUser WHERE group_id = $1 AND user_id = $2 RETURNING *',
            [groupId, userId],
            (err, result) => {
            if (err) {
                return next(err)
            }

            if (result.rowCount === 0) {
                const error = new Error('You are not a member of this group')
                error.status = 404
                return next(error)
            }

            res.status(200).json({ 
                message: 'Successfully left the group',
                id: result.rows[0].id 
            })
        })
    })
})

export default router