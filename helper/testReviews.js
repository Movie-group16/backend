import { expect } from "chai"
import { initializeTestDb, insertTestUser } from "./test.js"

describe("Reviews API Tests", () => {
    let testUser = null
    let reviewId = null

    const sampleReview = {
        movie_id: 123,
        review_title: "Awesome Movie",
        review_text: "I loved this movie a lot!",
        rating: 5
    }

    const updatedReview = {
        review_title: "Still Good",
        review_text: "It was great, but could have been shorter.",
        rating: 4
    }

before(async () => {
    await initializeTestDb()

    const userResponse = await fetch("http://localhost:3001/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user: {
                username: "review_test_user",
                email: "review_user@test.com",
                password_hash: "password123",
                user_desc: "For review API testing"
            }
        })
    })

    const userData = await userResponse.json()
    expect(userResponse.status).to.equal(201)
    testUser = userData
})


    after(async () => {
        try {
            await fetch(`http://localhost:3001/user/delete/${testUser.id}`, { method: "DELETE" })
        } catch (err) {}
    })


    
    describe("Create Review", () => {
        it("should create a new review successfully", async () => {
            const response = await fetch("http://localhost:3001/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ review: { ...sampleReview, user_id: testUser.id } })
            })

            const data = await response.json()
            expect(response.status).to.equal(201)
            expect(data).to.include.all.keys(["id", "user_id", "movie_id", "review_text", "rating"])
            expect(data.review_text).to.equal(sampleReview.review_text)
            reviewId = data.id
        })

        it("should not create review with missing fields", async () => {
            const incompleteReview = { user_id: testUser.id, rating: 3 }

            const response = await fetch("http://localhost:3001/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ review: incompleteReview })
            })

            const data = await response.json()
            expect(response.status).to.equal(500)
        })

        it("should not create review with null body", async () => {
            const response = await fetch("http://localhost:3001/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({})
            })

            const data = await response.json()
            expect(response.status).to.equal(400)
            expect(data.error.message).to.include("something went wrong with the review data")
        })
    })



    describe("Get Reviews", () => {
        it("should get all reviews", async () => {
            const response = await fetch("http://localhost:3001/reviews")
            const data = await response.json()
            expect(response.status).to.equal(200)
            expect(data).to.be.an("array")
        })

        it("should get reviews by user ID", async () => {
            const response = await fetch(`http://localhost:3001/reviews/${testUser.id}`)
            const data = await response.json()
            expect(response.status).to.equal(200)
            expect(data).to.be.an("array")
            expect(data.some(r => r.user_id === testUser.id)).to.be.true
        })

        it("should get review by user ID and movie ID", async () => {
            const response = await fetch(`http://localhost:3001/reviews/${testUser.id}/${sampleReview.movie_id}`)
            const data = await response.json()
            expect(response.status).to.equal(200)
            expect(data).to.be.an("array")
            expect(data[0].movie_id).to.equal(sampleReview.movie_id)
        })
    })



    describe("Update Review", () => {
        it("should update review successfully", async () => {
            const response = await fetch(`http://localhost:3001/reviews/${reviewId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ review: { ...updatedReview, user_id: testUser.id, movie_id: sampleReview.movie_id } })
            })
            const data = await response.json()
            expect(response.status).to.equal(200)
            expect(data.rating).to.equal(updatedReview.rating)
            expect(data.review_text).to.equal(updatedReview.review_text)
        })

        it("should not update non-existent review", async () => {
            const response = await fetch(`http://localhost:3001/reviews/99999`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ review: updatedReview })
            })
            const data = await response.json()
            expect(response.status).to.equal(404)
            expect(data.error).to.equal("Review not found")
        })

        it("should not update with invalid body", async () => {
            const response = await fetch(`http://localhost:3001/reviews/${reviewId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({})
            })
            const data = await response.json()
            expect(response.status).to.equal(400)
            expect(data.error.message).to.include("something went wrong with the review data")
        })
    })



    describe("Delete Review", () => {
        it("should delete review successfully", async () => {
            const response = await fetch(`http://localhost:3001/reviews/${reviewId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            })

            const data = await response.json()
            expect(response.status).to.equal(200)
            expect(data.id).to.equal(reviewId)
        })

        it("should return 404 when deleting non-existent review", async () => {
            const response = await fetch(`http://localhost:3001/reviews/99999`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            })

            const data = await response.json()
            expect(response.status).to.equal(404)
            expect(data.error.message).to.equal("Review not found")
        })
    })
})
