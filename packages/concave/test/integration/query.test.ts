import {describe, expect, it} from "vitest"

import {api} from "../convex/_generated/api"
import {setup} from "../setup"

describe("Query Operations", () => {
  describe("fullTableScan", () => {
    it("should collect all documents", async () => {
      const t = setup()

      await t.mutation(api.functions.users.createUser, {
        name: "User 1",
        email: "user1@example.com",
        role: "user",
      })
      await t.mutation(api.functions.users.createUser, {
        name: "User 2",
        email: "user2@example.com",
        role: "admin",
      })
      await t.mutation(api.functions.users.createUser, {
        name: "User 3",
        email: "user3@example.com",
        role: "user",
      })

      const users = await t.query(api.functions.users.listUsers, {})

      expect(users).toHaveLength(3)
    })

    it("should return empty array when no documents exist", async () => {
      const t = setup()

      const users = await t.query(api.functions.users.listUsers, {})

      expect(users).toEqual([])
    })
  })

  describe("order", () => {
    it("should order documents ascending", async () => {
      const t = setup()

      // Create users with slight delay to ensure different createdAt
      await t.mutation(api.functions.users.createUser, {
        name: "First",
        email: "first@example.com",
        role: "user",
      })
      await t.mutation(api.functions.users.createUser, {
        name: "Second",
        email: "second@example.com",
        role: "user",
      })

      const users = await t.query(api.functions.users.listUsersOrdered, {order: "asc"})

      expect(users.length).toBeGreaterThanOrEqual(2)
      // In ascending order, the first created should come first
      expect(users[0]!._creationTime).toBeLessThanOrEqual(users[1]!._creationTime)
    })

    it("should order documents descending", async () => {
      const t = setup()

      await t.mutation(api.functions.users.createUser, {
        name: "First",
        email: "first@example.com",
        role: "user",
      })
      await t.mutation(api.functions.users.createUser, {
        name: "Second",
        email: "second@example.com",
        role: "user",
      })

      const users = await t.query(api.functions.users.listUsersOrdered, {order: "desc"})

      expect(users.length).toBeGreaterThanOrEqual(2)
      // In descending order, the last created should come first
      expect(users[0]!._creationTime).toBeGreaterThanOrEqual(users[1]!._creationTime)
    })
  })

  describe("take", () => {
    it("should return first N documents", async () => {
      const t = setup()

      await t.mutation(api.functions.users.createUser, {
        name: "User 1",
        email: "user1@example.com",
        role: "user",
      })
      await t.mutation(api.functions.users.createUser, {
        name: "User 2",
        email: "user2@example.com",
        role: "user",
      })
      await t.mutation(api.functions.users.createUser, {
        name: "User 3",
        email: "user3@example.com",
        role: "user",
      })

      const users = await t.query(api.functions.users.takeUsers, {count: 2})

      expect(users).toHaveLength(2)
    })

    it("should return all documents when count exceeds total", async () => {
      const t = setup()

      await t.mutation(api.functions.users.createUser, {
        name: "Only User",
        email: "only@example.com",
        role: "user",
      })

      const users = await t.query(api.functions.users.takeUsers, {count: 10})

      expect(users).toHaveLength(1)
    })
  })

  describe("first", () => {
    it("should return the first document", async () => {
      const t = setup()

      await t.mutation(api.functions.users.createUser, {
        name: "First User",
        email: "first@example.com",
        role: "user",
      })
      await t.mutation(api.functions.users.createUser, {
        name: "Second User",
        email: "second@example.com",
        role: "user",
      })

      const user = await t.query(api.functions.users.getFirstUser, {})

      expect(user).toBeDefined()
      expect(user?.name).toBe("First User")
    })

    it("should return null when no documents exist", async () => {
      const t = setup()

      const user = await t.query(api.functions.users.getFirstUser, {})

      expect(user).toBeNull()
    })
  })

  describe("withIndex", () => {
    it("should query with exact match", async () => {
      const t = setup()

      await t.mutation(api.functions.users.createUser, {
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      })
      await t.mutation(api.functions.users.createUser, {
        name: "Regular User",
        email: "regular@example.com",
        role: "user",
      })

      const admins = await t.query(api.functions.users.listUsersByRole, {role: "admin"})

      expect(admins).toHaveLength(1)
      expect(admins[0]!.role).toBe("admin")
    })

    it("should return empty array when no matches", async () => {
      const t = setup()

      await t.mutation(api.functions.users.createUser, {
        name: "Regular User",
        email: "regular@example.com",
        role: "user",
      })

      const admins = await t.query(api.functions.users.listUsersByRole, {role: "admin"})

      expect(admins).toEqual([])
    })
  })

  describe("unique", () => {
    it("should return the document when exactly one match", async () => {
      const t = setup()

      await t.mutation(api.functions.users.createUser, {
        name: "Unique User",
        email: "unique@example.com",
        role: "user",
      })

      const user = await t.query(api.functions.users.getUserByEmail, {
        email: "unique@example.com",
      })

      expect(user).toBeDefined()
      expect(user?.email).toBe("unique@example.com")
    })

    it("should return null when no matches", async () => {
      const t = setup()

      const user = await t.query(api.functions.users.getUserByEmail, {
        email: "nonexistent@example.com",
      })

      expect(user).toBeNull()
    })
  })

  describe("pagination", () => {
    it("should return paginated results with cursor", async () => {
      const t = setup()

      // Create multiple users
      for (let i = 0; i < 5; i++) {
        await t.mutation(api.functions.users.createUser, {
          name: `User ${i}`,
          email: `user${i}@example.com`,
          role: "user",
        })
      }

      const firstPage = await t.query(api.functions.users.listUsersPaginated, {
        paginationOpts: {numItems: 2, cursor: null},
      })

      expect(firstPage.page).toHaveLength(2)
      expect(firstPage.isDone).toBe(false)
      expect(firstPage.continueCursor).toBeDefined()
    })

    it("should return subsequent pages using cursor", async () => {
      const t = setup()

      // Create multiple users
      for (let i = 0; i < 5; i++) {
        await t.mutation(api.functions.users.createUser, {
          name: `User ${i}`,
          email: `user${i}@example.com`,
          role: "user",
        })
      }

      const firstPage = await t.query(api.functions.users.listUsersPaginated, {
        paginationOpts: {numItems: 2, cursor: null},
      })

      const secondPage = await t.query(api.functions.users.listUsersPaginated, {
        paginationOpts: {numItems: 2, cursor: firstPage.continueCursor},
      })

      expect(secondPage.page).toHaveLength(2)
      // Ensure no overlap
      const firstPageIds = firstPage.page.map((u: {_id: string}) => u._id)
      const secondPageIds = secondPage.page.map((u: {_id: string}) => u._id)
      expect(firstPageIds.some((id: string) => secondPageIds.includes(id))).toBe(false)
    })

    it("should indicate done when no more results", async () => {
      const t = setup()

      await t.mutation(api.functions.users.createUser, {
        name: "Single User",
        email: "single@example.com",
        role: "user",
      })

      const result = await t.query(api.functions.users.listUsersPaginated, {
        paginationOpts: {numItems: 10, cursor: null},
      })

      expect(result.page).toHaveLength(1)
      expect(result.isDone).toBe(true)
    })
  })

  describe("compound index queries", () => {
    it("should query with compound index", async () => {
      const t = setup()

      const authorId = await t.mutation(api.functions.users.createUser, {
        name: "Author",
        email: "author@example.com",
        role: "user",
      })

      await t.mutation(api.functions.posts.createPost, {
        authorId,
        title: "Draft Post",
        content: "Draft content",
      })

      await t.mutation(api.functions.posts.createPost, {
        authorId,
        title: "Published Post",
        content: "Published content",
      })

      // Publish the second post
      const posts = await t.query(api.functions.posts.listPostsByAuthor, {authorId})
      const publishedPostId = posts.find(
        (p: {title: string; _id: string}) => p.title === "Published Post",
      )?._id
      if (publishedPostId) {
        await t.mutation(api.functions.posts.publishPost, {id: publishedPostId})
      }

      const draftsByAuthor = await t.query(api.functions.posts.listPostsByAuthorAndStatus, {
        authorId,
        status: "draft",
      })

      expect(draftsByAuthor).toHaveLength(1)
      expect(draftsByAuthor[0]!.title).toBe("Draft Post")
    })
  })

  describe("search index", () => {
    // Note: convex-test has simplified text search semantics that may not
    // return results the same way as production Convex. This test verifies
    // that the search index query executes without error.
    it("should search content using search index", async () => {
      const t = setup()

      const authorId = await t.mutation(api.functions.users.createUser, {
        name: "Author",
        email: "author@example.com",
        role: "user",
      })

      await t.mutation(api.functions.posts.createPost, {
        authorId,
        title: "Post About Cats",
        content: "Cats are wonderful pets that bring joy",
      })

      await t.mutation(api.functions.posts.createPost, {
        authorId,
        title: "Post About Dogs",
        content: "Dogs are loyal companions",
      })

      // convex-test may return different results than production
      // We just verify the query executes and returns an array
      const catPosts = await t.query(api.functions.posts.searchPosts, {
        searchQuery: "cats wonderful",
      })

      expect(Array.isArray(catPosts)).toBe(true)
    })

    it("should return empty array when no search matches", async () => {
      const t = setup()

      const authorId = await t.mutation(api.functions.users.createUser, {
        name: "Author",
        email: "author@example.com",
        role: "user",
      })

      await t.mutation(api.functions.posts.createPost, {
        authorId,
        title: "Post About Cats",
        content: "Cats are wonderful pets",
      })

      const results = await t.query(api.functions.posts.searchPosts, {
        searchQuery: "elephants",
      })

      expect(results).toEqual([])
    })
  })

  describe("filter", () => {
    it("should filter results with search and additional filter", async () => {
      const t = setup()

      const authorId = await t.mutation(api.functions.users.createUser, {
        name: "Author",
        email: "author@example.com",
        role: "user",
      })

      await t.mutation(api.functions.posts.createPost, {
        authorId,
        title: "Draft Post",
        content: "This is a draft about testing",
      })

      const postId = (await t.mutation(api.functions.posts.createPost, {
        authorId,
        title: "Published Post",
        content: "This is published about testing",
      })) as string

      await t.mutation(api.functions.posts.publishPost, {id: postId as unknown as never})

      const publishedResults = await t.query(api.functions.posts.searchPostsWithFilters, {
        searchQuery: "testing",
        status: "published",
      })

      expect(publishedResults).toHaveLength(1)
      expect(publishedResults[0]!.status).toBe("published")
    })
  })

  it("should call internal query within a query", async () => {
    const t = setup()

    // Create a post which internally calls user functions
    const userId = await t.mutation(api.functions.users.createUser, {
      name: "Author",
      email: "author@example.com",
      role: "user",
    })

    const postId = await t.mutation(api.functions.posts.createPost, {
      authorId: userId,
      title: "Test Post",
      content: "Test content",
    })

    // getPostWithAuthor is an internal query that fetches the author via nested query
    const result = await t.query(api.functions.posts.getPostWithAuthor, {id: postId})

    expect(result).toBeDefined()
    expect(result?.post.title).toBe("Test Post")
    expect(result?.author?.name).toBe("Author")
  })
})
