import express from 'express'
import cors from 'cors'
import pkg from 'pg'
import dotenv from 'dotenv'

const port = process.env.PORT || 3001
const { Pool } = pkg
dotenv.config()


const openDb = () => {
    const pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.NODE_ENV === 'test' ? process.env.TEST_DB_NAME : process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    })
    return pool
}


const app = express()
app.use(cors())

app.get('/', (req, res) => {

    const pool = openDb()

    pool.query('SELECT * FROM users', (error, results) => {
        if (error) {
            throw error
        }

        res.status(200).json(results.rows)
    })

})

app.get('/groups', (req, res) => {

    const pool = openDb()

    pool.query('SELECT * FROM groups', (error, results) => {
        if (error) {
            throw error
        }

        res.status(200).json(results.rows)
    })

})

app.get('/groupUsers', (req, res) => {

    const pool = openDb()

    pool.query('SELECT username, email, user_desc, group_name, group_desc, group_rules FROM groupUser INNER JOIN users ON groupUser.user_id = users.id INNER JOIN groups ON groupUser.group_id = groups.id', (error, results) => {
        if (error) {
            throw error
        }

        res.status(200).json(results.rows)
    })

})


app.listen(port, () => {
  console.log(`Server is running on port: ${port}`)
})

export default app