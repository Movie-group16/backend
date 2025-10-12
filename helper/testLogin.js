import { expect } from "chai"
import { initializeTestDb, insertTestUser } from "./test.js"

describe("User Authentication and Profile Tests", () => {
    const testUser = { 
        username: "testuser_unique", 
        email: "test@example.com", 
        password_hash: "password123",
        user_desc: "Test user description"
    }
    
    const testUser2 = { 
        username: "testuser2_unique", 
        email: "test2@example.com", 
        password_hash: "password456",
        user_desc: "Second test user"
    }

    let userId = null
    let authToken = null

    before(async () => {
        await initializeTestDb()

        after(async () => {
            try {
                await fetch(`http://localhost:3001/user/delete/${userId}`, {
                    method: "DELETE"
                })
            } catch (error) {
            }
        })
    })

    describe("User Registration", () => {
        it("should register a new user successfully", async () => {
            const response = await fetch("http://localhost:3001/user/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user: testUser })
            })
            
            const data = await response.json()
            expect(response.status).to.equal(201)
            expect(data).to.include.all.keys(["id", "email"])
            expect(data.email).to.equal(testUser.email)
            userId = data.id
        })

        it("should not register user with duplicate username", async () => {
            const duplicateUser = { 
                username: testUser.username, 
                email: "different@email.com", 
                password_hash: "password123",
                user_desc: "Duplicate test"
            }
            
            const response = await fetch("http://localhost:3001/user/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user: duplicateUser })
            })
            
            expect(response.status).to.equal(500) 
        })

        it("should not register user with duplicate email", async () => {
            const duplicateUser = { 
                username: "differentusername_unique", 
                email: testUser.email, 
                password_hash: "password123",
                user_desc: "Duplicate email test"
            }
            
            const response = await fetch("http://localhost:3001/user/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user: duplicateUser })
            })
            
            expect(response.status).to.equal(500) 
        })

        it("should not register user with missing required fields", async () => {
            const incompleteUser = { 
                username: "incomplete", 
                email: "incomplete@test.com"
            }
            
            const response = await fetch("http://localhost:3001/user/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user: incompleteUser })
            })
            
            const data = await response.json()
            expect(response.status).to.equal(400)
            expect(data.error.message).to.include("Username, email and password are required")
        })

        it("should not register user with null user object", async () => {
            const response = await fetch("http://localhost:3001/user/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user: null })
            })
            
            const data = await response.json()
            expect(response.status).to.equal(400)
            expect(data.error.message).to.include("Username, email and password are required")
        })

        it("should register second user for testing", async () => {
            const response = await fetch("http://localhost:3001/user/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user: testUser2 })
            })
            
            const data = await response.json()
            expect(response.status).to.equal(201)
            expect(data).to.include.all.keys(["id", "email"])
            expect(data.email).to.equal(testUser2.email)
        })
    })

    describe("User Login", () => {
        it("should login with username successfully", async () => {
            const loginData = {
                nameoremail: testUser.username,
                password_hash: testUser.password_hash
            }
            
            const response = await fetch("http://localhost:3001/user/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user: loginData })
            })
            
            const data = await response.json()
            expect(response.status).to.equal(200)
            expect(data).to.include.all.keys(["id", "username", "email", "user_desc", "token"])
            expect(data.username).to.equal(testUser.username)
            expect(data.email).to.equal(testUser.email)
            expect(data.token).to.be.a("string")
            authToken = data.token
        })

        it("should login with email successfully", async () => {
            const loginData = {
                nameoremail: testUser.email,
                password_hash: testUser.password_hash
            }
            
            const response = await fetch("http://localhost:3001/user/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user: loginData })
            })
            
            const data = await response.json()
            expect(response.status).to.equal(200)
            expect(data).to.include.all.keys(["id", "username", "email", "user_desc", "token"])
            expect(data.email).to.equal(testUser.email)
            expect(data.token).to.be.a("string")
        })

        it("should not login with wrong password", async () => {
            const loginData = {
                nameoremail: testUser.username,
                password_hash: "wrongpassword"
            }
            
            const response = await fetch("http://localhost:3001/user/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user: loginData })
            })
            
            const data = await response.json()
            expect(response.status).to.equal(401)
            expect(data.error.message).to.equal("Invalid password")
        })

        it("should not login with non-existent user", async () => {
            const loginData = {
                nameoremail: "nonexistent@user.com",
                password_hash: "somepassword"
            }
            
            const response = await fetch("http://localhost:3001/user/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user: loginData })
            })
            
            const data = await response.json()
            expect(response.status).to.equal(404)
            expect(data.error.message).to.equal("User not found")
        })

        it("should not login with missing credentials", async () => {
            const response = await fetch("http://localhost:3001/user/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user: { nameoremail: testUser.username } })
            })
            
            const data = await response.json()
            expect(response.status).to.equal(400)
            expect(data.error.message).to.include("Your email and password are required")
        })

        it("should not login with null user object", async () => {
            const response = await fetch("http://localhost:3001/user/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user: null })
            })
            
            const data = await response.json()
            expect(response.status).to.equal(400)
            expect(data.error.message).to.include("Your email and password are required")
        })
    })

    describe("User Deletion", () => {
        let userToDeleteId = null

        it("should create a user to delete", async () => {
            const userToDelete = {
                username: "deleteme",
                email: "deleteme@test.com",
                password_hash: "password123",
                user_desc: "User to be deleted"
            }

            const response = await fetch("http://localhost:3001/user/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user: userToDelete })
            })
            
            const data = await response.json()
            expect(response.status).to.equal(201)
            userToDeleteId = data.id
        })

        it("should delete user profile successfully", async () => {
            const response = await fetch(`http://localhost:3001/user/delete/${userToDeleteId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            })
            
            const data = await response.json()
            expect(response.status).to.equal(200)
            expect(data.id).to.equal(userToDeleteId.toString())
        })

        it("should return 404 when trying to delete non-existent user", async () => {
            const response = await fetch(`http://localhost:3001/user/delete/99999`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            })
            
            const data = await response.json()
            expect(response.status).to.equal(404)
            expect(data.error.message).to.equal("user not found")
        })

        it("should verify user was actually deleted", async () => {
            const response = await fetch(`http://localhost:3001/user/${userToDeleteId}`)
            const data = await response.json()
            
            expect(response.status).to.equal(404)
            expect(data.error.message).to.equal("User not found")
        })
    })
})