import express from 'express'
import cors from 'cors'
import userRouter from './routes/userRouter.js'
import groupRouter from './routes/groupRouter.js'
import reviewRouter from './routes/reviewRouter.js'

const port = process.env.PORT || 3001

const app = express()
app.use(express.json())
app.use('/user', userRouter)
app.use('/groups', groupRouter)
app.use('/reviews', reviewRouter)
app.use(cors())


app.use((err, req, res, next) => {
    const sttusCode = res.status || 500

    res.status(statusCode).json({
        error: {
            message: err.message || 'Something went wrong',
            status: statusCode
        }
    })
})


app.listen(port, () => {
  console.log(`Server is running on port: ${port}`)
})

export default app