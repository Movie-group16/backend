import { expect } from "chai"
import { initializeTestDb } from "./helper/test.js"
import { insertTestUser } from "./helper/test.js"
import { getToken } from "./helper/test.js"

describe("Testing basic database functionality", () => {
    let token = null
    const testUser = { username: "Testuser", email: "foo@foo.com", password: "password123" }
      before(async () => {
        await initializeTestDb()
        token = await getToken(testUser)
     })

    it("should get the user", async () => {
        const response = await fetch("http://localhost:3001/")
        const data = await response.json()
        expect(response.status).to.equal(200)
        expect(data).to.be.an("array").that.is.not.empty
        expect(data[0]).to.include.all.keys(["id", "description"])
    })

    it("should create a new user", async () => {
        const newUser = { description: "New user"}
        const response = await fetch("http://localhost:3001/create",{
            method: "post",
            headers: {
            "Content-Type": "application/json",
            Authorization: token
          },
            body: JSON.stringify({ user: newUser })
        })
        const data = await response.json()
        expect(response.status).to.equal(201)
        expect(data).to.include.all.keys(["id", "description"])
        expect(data.description).to.equal(newUser.description)
    })

    it("should delete the user", async () => {
        const response = await fetch("http://localhost:3001/delete/1",{
        method: "delete",
        headers: {
        "Content-Type": "application/json",
        Authorization: token
      }
    })
        const data = await response.json()
        expect(response.status).to.equal(200)
        expect(data).to.include.all.keys("id")
  })
})

describe("Testing user management", () => {
    const user = { username: "Testuser", email: "foo2@test.com", password: "password123" }
      before(async () => {
        await insertTestUser(user)
    })

    it("should sign up", async () => {
        const newUser = { username: "Testuser", email: "foo@test.com", password: "password123" }

        const response = await fetch("http://localhost:3001/user/register", {
            method: "post",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({ user: newUser })
        })
        const data = await response.json()
        expect(response.status).to.equal(201)
        expect(data).to.include.all.keys(["id", "email"])
        expect(data.email).to.equal(newUser.email)
    })

    it("should log in", async () => {
        const response = await fetch("http://localhost:3001/user/login", {
            method: "post",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({ user })
        })
        const data = await response.json()
        expect(response.status).to.equal(200)
        expect(data).to.include.all.keys(["id", "email", "token"])
        expect(data.email).to.equal(user.email)
    })
})
