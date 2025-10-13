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

router.post('/', (req, res, next) => {
    const { review } = req.body

    console.log(review)

    if (!req.body) {
        const error = new Error('something went wrong with the review data')
        console.log(error)
        error.status = 400
        return next(error)
    }

    pool.query('INSERT INTO reviews (user_id, movie_id, review_title, review_text, rating) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [review.user_id, review.movie_id, review.review_title, review.review_text, review.rating],
        (err, result) => {
        if (err) {
            return next(err)
        }

        res.status(201).json({ id: result.rows[0].id, user_id: review.user_id, movie_id: review.movie_id, review_text: review.review_text, rating: review.rating })
    })
})

router.put('/:id', (req, res, next) => {
    const { id } = req.params
    const { review } = req.body
    console.log(Number(id))
    console.log(review)
    if (!req.body) {
        const error = new Error('something went wrong with the review data')
        error.status = 400
        return next(error)
    }

    pool.query('UPDATE reviews SET review_title = $1, review_text = $2, rating = $3 WHERE id = $4 RETURNING *',
        [review.review_title, review.review_text, review.rating, id],
        (err, result) => {
        if (err) {
            return next(err)
        }
        res.status(200).json({ id: result.rows[0].id, user_id: review.user_id, movie_id: review.movie_id, review_text: review.review_text, rating: review.rating })
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