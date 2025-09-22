import { pool } from '../helper/db.js'
import { Router } from 'express'

const router = Router()

router.post("/users/:userId/favourites/:movieId", async (req, res) => {
    const { userId, movieId } = req.params;

    try {
        await pool.query(
            "INSERT INTO favourites (user_id, movie_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [userId, movieId]
        );
        res.status(201).json({ message: "Movie added to favourites" });
    } catch (error) {
        console.error("Error adding favourite:", error);
        res.status(500).json({ error: "Internal server error" })
    }
});


router.delete("/users/:userId/favourites/:movieId", async (req, res) => {
    const { userId, movieId } = req.params;

    try {
        const result = await pool.query(
            "DELETE FROM favourites WHERE user_id = $1 AND movie_id = $2",
            [userId, movieId]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Favourite not found" });
        }
        res.json({ message: "Movie removed from favourites"});
    } catch (error) {
        console.error("Error removing favourite:", error);
        res.status(500).json({ error: "Internal server error" });
    }






    
})

export default router