import { pool } from '../helper/db.js'
import { Router } from 'express'

const router = Router()

router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:userId", async (req, res) => {
  const { userId } = req.params;
  const { description } = req.body;
  const { email } = req.body;

  try {
    const result = await pool.query(
      "UPDATE users SET user_desc = $1, email = $2 WHERE id = $3 RETURNING *",
      [description, email, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating description:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get('/groups/:userId', async (req, res, next) => {
  const { userId } = req.params;
  try {
    const query = `
      SELECT g.id, g.group_name, g.group_desc, g.group_rules, gu.is_admin
      FROM groupUser AS gu
      INNER JOIN groups AS g ON gu.group_id = g.id
      WHERE gu.user_id = $1 AND gu.status = 'member'
      ORDER BY g.group_name ASC
    `;
    const result = await pool.query(query, [userId]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching user groups:', err);
    res.status(500).json({ error: 'Failed to fetch user groups' });
  }
});


export default router