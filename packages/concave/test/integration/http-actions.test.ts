import {describe, expect, it} from "vitest"

import {setup} from "../setup"

describe("HTTP Actions", () => {
  describe("Request Methods", () => {
    it("should handle GET requests", async () => {
      const t = setup()

      const response = await t.fetch("/noauth", {method: "GET"})

      expect(response.status).toBe(200)
      const body = await (response.json() as Promise<unknown>)
      expect(body).toEqual({message: "public get"})
    })

    it("should handle POST requests", async () => {
      const t = setup()

      const response = await t.fetch("/noauth", {
        method: "POST",
        body: JSON.stringify({data: "test data"}),
        headers: {"Content-Type": "application/json"},
      })

      expect(response.status).toBe(201)
      const body = await (response.json() as Promise<unknown>)
      expect(body).toEqual({received: "test data"})
    })

    it("should set correct content-type", async () => {
      const t = setup()

      const response = await t.fetch("/noauth", {method: "GET"})

      expect(response.headers.get("Content-Type")).toBe("application/json")
    })
  })

  describe("Cross-Function Calls", () => {
    it("should call query via runQuery", async () => {
      const t = setup()

      const response = await t.fetch("/calls-query?value=5", {method: "GET"})

      expect(response.status).toBe(200)
      const body = await (response.json() as Promise<{result: string}>)
      expect(body.result).toBe("internal: 10")
    })

    it("should call mutation via runMutation", async () => {
      const t = setup()

      const response = await t.fetch("/calls-mutation", {
        method: "POST",
        body: JSON.stringify({name: "HTTP Created"}),
        headers: {"Content-Type": "application/json"},
      })

      expect(response.status).toBe(201)
      const body = await (response.json() as Promise<{id: string}>)
      expect(body.id).toBeDefined()
      expect(typeof body.id).toBe("string")
    })
  })

  describe("Request/Response", () => {
    it("should parse JSON body", async () => {
      const t = setup()

      const response = await t.fetch("/noauth", {
        method: "POST",
        body: JSON.stringify({data: "json body content"}),
        headers: {"Content-Type": "application/json"},
      })

      expect(response.status).toBe(201)
      const body = await (response.json() as Promise<{received: string}>)
      expect(body.received).toBe("json body content")
    })

    it("should parse query parameters", async () => {
      const t = setup()

      const response = await t.fetch("/with-params?name=testname&count=42", {method: "GET"})

      expect(response.status).toBe(200)
      const body = await (response.json() as Promise<{name: string; count: number}>)
      expect(body.name).toBe("testname")
      expect(body.count).toBe(42)
    })

    it("should return JSON response", async () => {
      const t = setup()

      const response = await t.fetch("/health", {method: "GET"})

      expect(response.status).toBe(200)
      expect(response.headers.get("Content-Type")).toBe("application/json")
      const body = await (response.json() as Promise<{status: string}>)
      expect(body).toEqual({status: "ok"})
    })
  })
})
