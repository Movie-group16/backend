import express from 'express'
import cors from 'cors'
import userRouter from './routers/userRouter.js'
import groupRouter from './routers/groupRouter.js'
import reviewRouter from './routers/reviewRouter.js'
import favouriteRouter from './routers/favouriteRouter.js'
import friendsRouter from './routers/friendsRouter.js'

const port = process.env.PORT || 3001

const app = express()

app.use(cors())
app.use(express.json())
app.use('/user', userRouter)
app.use('/groups', groupRouter)
app.use('/reviews', reviewRouter)
app.use('/favourites', favouriteRouter)
app.use('/friends', friendsRouter)

app.use((err, req, res, next) => {
    const statusCode = err.status || 500

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