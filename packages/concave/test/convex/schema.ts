import {defineSchema, defineTable} from "convex/server"
import {v} from "convex/values"

export default defineSchema({
  // Users table - basic CRUD, indexes
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    profileImageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_role_and_created", ["role", "createdAt"]),

  // Posts table - relations, search indexes
  posts: defineTable({
    authorId: v.id("users"),
    title: v.string(),
    content: v.string(),
    status: v.union(v.literal("draft"), v.literal("published")),
    publishedAt: v.optional(v.number()),
  })
    .index("by_author", ["authorId"])
    .index("by_status", ["status"])
    .index("by_author_and_status", ["authorId", "status"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["authorId", "status"],
    }),

  // Comments table - nested relations
  comments: defineTable({
    postId: v.id("posts"),
    authorId: v.id("users"),
    content: v.string(),
  })
    .index("by_post", ["postId"])
    .index("by_author", ["authorId"]),

  // Files metadata table - storage references
  files: defineTable({
    storageId: v.id("_storage"),
    uploadedBy: v.id("users"),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
  }).index("by_uploader", ["uploadedBy"]),

  // Scheduled tasks tracking
  scheduledTasks: defineTable({
    type: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("cancelled")),
    scheduledId: v.optional(v.id("_scheduled_functions")),
    data: v.any(),
  }).index("by_status", ["status"]),
})
