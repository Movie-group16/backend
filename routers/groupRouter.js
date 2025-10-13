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

router.get('/:groupId/members', (req, res, next) => {
  const { groupId } = req.params

  const query = `
    SELECT 
      u.id AS user_id,
      u.username,
      u.email,
      u.user_desc,
      gu.is_admin,
      gu.status
    FROM groupUser AS gu
    INNER JOIN users AS u ON gu.user_id = u.id
    WHERE gu.group_id = $1 AND gu.status = 'member'
  `

  pool.query(query, [groupId], (err, result) => {
    if (err) {
      console.error('Error fetching group members:', err)
      return res.status(500).json({ error: 'Failed to fetch group members' })
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No members found for this group' })
    }

    res.status(200).json(result.rows)
  })
})

router.get('/:groupId/requests', (req, res, next) => {
  const { groupId } = req.params

  const query = `
    SELECT 
      u.id AS user_id,
      u.username,
      u.email,
      u.user_desc,
      gu.status
    FROM groupUser AS gu
    INNER JOIN users AS u ON gu.user_id = u.id
    WHERE gu.group_id = $1 AND gu.status = 'pending'
  `

  pool.query(query, [groupId], (err, result) => {
    if (err) {
      console.error('Error fetching join requests:', err)
      return res.status(500).json({ error: 'Failed to fetch join requests' })
    }

    res.status(200).json(result.rows)
  })
})

// For accepting invitation
router.post('/:groupId/invite/:inviteId/accept', async (req, res, next) => {
  const { groupId, inviteId } = req.params
  const userId = Number(req.body.userId)

  try {
    const inviteRes = await pool.query(
      `SELECT * FROM groupInvites
       WHERE id=$1 AND group_id=$2 AND user_id=$3 AND status = 'pending'`,
      [inviteId, groupId, userId]
    )
    if (inviteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invite not found or already used.' })
    }

    await pool.query(`
      INSERT INTO groupUser (group_id, user_id, status, is_admin)
      VALUES ($1, $2, 'member', false)
      ON CONFLICT (group_id, user_id) DO NOTHING`, 
     [groupId, userId]
    )

    await pool.query(
      `UPDATE groupInvites SET status = 'accepted' WHERE id = $1`,
      [inviteId]
    )

    res.status(200).json({ message: 'Successfully joined the group!' })
  } catch (err) {
    console.error('Error accepting invitation:', err)
    res.status(500).json({ error: 'Failed to accept invitation' })
  }
})

// For declining invitation
router.post('/:groupId/invite/:inviteId/decline', async (req, res, next) => {
  const { inviteId } = req.params

  try {
    await pool.query(
      `UPDATE groupInvites SET status = 'declined' WHERE id = $1`,
      [inviteId]
    );

    res.status(200).json({ message: 'Invitation declined.' })
  } catch (err) {
    console.error('Error declining invitation:', err)
    res.status(500).json({ error: 'Failed to decline invitation' })
  }
})

// For sending an invitation
router.post('/:groupId/invite/:userId', async (req, res, next) => {
  const { groupId, userId } = req.params
  const invitedBy = Number(req.body.invitedBy)

  try {
    const result = await pool.query(`
      INSERT INTO groupInvites (group_id, user_id, invited_by, status)
      VALUES ($1, $2, $3, 'pending')
      ON CONFLICT (group_id, user_id)
      DO UPDATE SET status = 'pending'
      RETURNING *
    `, [groupId, userId, invitedBy])

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error sending invitation:', err)
    res.status(500).json({ error: 'Failed to send invitation' })
  }
})

router.get('/:groupId/invites', async (req, res, next) => {
  const { groupId } = req.params
  const currentUserId = Number(req.query.userId)

  try {
    const query = `
      SELECT 
        u.id AS user_id, 
        u.username, 
        u.email, 
        u.user_desc, 
        gi.status AS invite_status
      FROM users AS u
      LEFT JOIN groupInvites AS gi
        ON gi.user_id = u.id AND gi.group_id = $1
      WHERE 
        u.id != $2
        AND u.id NOT IN (
          SELECT gu.user_id 
          FROM groupUser AS gu 
          WHERE gu.group_id = $1
          AND gu.status IN ('member', 'requested', 'pending')
        )
      ORDER BY u.username ASC
    `

    const result = await pool.query(query, [groupId, currentUserId])
    res.status(200).json(result.rows)
  } catch (err) {
    console.error('Error fetching invite list:', err)
    res.status(500).json({ error: 'Failed to fetch invite list' })
  }
})

// For getting all invitations received by a specific user (across all groups)
router.get('/user/:userId/invitations', async (req, res, next) => {
  const { userId } = req.params

  try {
    const query = `
      SELECT 
        gi.id AS invite_id,
        gi.group_id,
        gi.status,
        gi.created_at,
        g.group_name,
        g.group_desc,
        u.username AS invited_by_name
      FROM groupInvites AS gi
      JOIN groups AS g ON gi.group_id = g.id
      LEFT JOIN users AS u ON gi.invited_by = u.id
      WHERE gi.user_id = $1 AND gi.status='pending' 
      ORDER BY gi.created_at DESC
    `
    const result = await pool.query(query, [userId])
    res.status(200).json(result.rows)
  } catch (err) {
    console.error('Error fetching user invitations:', err)
    res.status(500).json({ error: 'Failed to fetch invitations' })
  }
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
  const { groupId } = req.params
  const { userId, isAdmin = false, status = 'pending' } = req.body

  const uid = Number(userId)
  const gid = Number(groupId)

  if (!uid || !gid) {
    return res.status(400).json({ error: 'Invalid userId or groupId' })
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
      console.error('Database error on join request:', err)
      return res.status(500).json({ error: 'Failed to send join request', details: err.message })
    }
    res.status(201).json(result.rows[0])
  })
})

// For approving join request
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

// For rejecting join request
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

router.put('/:groupId/members/:userId/remove', (req, res, next) => {
  const { groupId, userId } = req.params;

  pool.query(
    `UPDATE groupUser
     SET status = 'removed'
     WHERE group_id = $1 AND user_id = $2
     RETURNING *`,
    [groupId, userId],
    (err, result) => {
      if (err) return next(err)
      if (result.rowCount === 0) {
        const error = new Error('User not found in this group')
        error.status = 404
        return next(error)
      }
      res.status(200).json({ message: 'Member removed successfully' })
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

export default router