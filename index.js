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
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`)
})

export default app