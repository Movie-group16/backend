import { expect } from "chai"
import { initializeTestDb } from "./helper/test.js"
import { insertTestUser } from "./helper/test.js"
import { getToken } from "./helper/test.js"

describe("Testing basic database functionality", () => {
    

  let token = null
    const newUser = { username: "Testuser", email: "foo@test.com", password_hash: "password123" }
    before(async () => {
      await initializeTestDb()
        await insertTestUser(newUser)
        token = await getToken(newUser)
    })


    it("should sign up", async () => {
        const newUser2 = { username: "Testuser2", email: "foo2@test.com", password_hash: "password123" }
        const response = await fetch("http://localhost:3001/user/register", {
            method: "post",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({ user: newUser2 })
        })
        const data = await response.json()
        expect(response.status).to.equal(201)
        expect(data).to.include.all.keys(["id", "email"])
        expect(data.email).to.equal(newUser2.email)
    })

    it("should log in", async () => {
        const response = await fetch("http://localhost:3001/user/login", {
            method: "post",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({ user:newUser })
        })
        const data = await response.json()
        expect(response.status).to.equal(200)
        expect(data).to.include.all.keys(["id", "email", "token"])
        expect(data.email).to.equal(newUser.email)
    })

    it("should get all users", async () => {
        const response = await fetch("http://localhost:3001/user/")
        const data = await response.json()
        expect(response.status).to.equal(200)
        expect(data).to.be.an("array").that.is.not.empty
        expect(data[0]).to.include.all.keys(["id", "user_desc"])
    })

    it("should get the user with username", async () => {
        const response = await fetch(`http://localhost:3001/user/${newUser.username}`)
        const data = await response.json()
        expect(response.status).to.equal(200)
        expect(data).to.be.an("array").that.is.not.empty
        expect(data[0]).to.include.all.keys(["id", "user_desc"])
    })
})

