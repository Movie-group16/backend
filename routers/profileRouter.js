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

export default router