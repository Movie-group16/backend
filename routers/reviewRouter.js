import { pool } from '../helper/db.js'
import { Router } from 'express'

const router = Router()

router.get('/', (req, res, next) => {

    pool.query('SELECT * FROM reviews', (error, results) => {
        if (error) {
            return next(error)
        }

        res.status(200).json(results.rows)
    })
})

router.get('/:id/:movieId', (req, res, next) => {

    pool.query('SELECT * FROM reviews WHERE user_id = $1 AND movie_id = $2', 
        [req.params.id, req.params.movieId], 
        (err, result) => {
        if(err){
            return next(err)
        }

        res.status(200).json(result.rows)
    })
})

router.get('/:id', (req, res, next) => {

    pool.query('SELECT * FROM reviews WHERE user_id = $1', 
        [req.params.id], 
        (err, result) => {
        if(err){
            return next(err)
        }

        res.status(200).json(result.rows)
    })
})

router.post('/', (req, res, next) => {
    const { review } = req.body

    if (!review || !review.user_id || !review.movie_id || !review.review_text || !review.rating) {
        const error = new Error('User, movie, review text and rating are required')
        error.status = 400
        return next(error)
    }

    pool.query('INSERT INTO reviews (user_id, movie_id, review_text, rating) VALUES ($1, $2, $3, $4) RETURNING *',
        [review.user_id, review.movie_id, review.review_text, review.rating],
        (err, result) => {
        if (err) {
            return next(err)
        }

        res.status(201).json({ id: result.rows[0].id, user_id: review.user_id, movie_id: review.movie_id, review_text: review.review_text, rating: review.rating })
    })
})

router.delete('/:id', (req, res, next) => {
    const { id } = req.params;

    console.log(`Deleting review with id: ${id}`);

    pool.query('DELETE FROM reviews WHERE id = $1 RETURNING *', 
        [id], (err, result) => {
        if (err) {
            console.error(err);
            return next(err); 
        }

        if (result.rowCount === 0) {
            const error = new Error('Review not found');
            error.status = 404;
            return next(error);
        }

        res.status(200).json({ id: result.rows[0].id });
    })
})

export default router