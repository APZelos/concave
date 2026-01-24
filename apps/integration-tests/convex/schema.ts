import {defineSchema, defineTable} from "convex/server"
import {v} from "convex/values"

export default defineSchema({
  items: defineTable({
    name: v.string(),
    category: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    priority: v.number(),
    value: v.number(),
    content: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_status", ["status"])
    .index("by_value", ["value"])
    .index("by_created_at", ["createdAt"])
    .index("by_category_status", ["category", "status"])
    .index("by_category_priority", ["category", "priority"])
    .index("by_category_value", ["category", "value"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["category", "status"],
    }),

  details: defineTable({
    itemId: v.id("items"),
    info: v.string(),
  }).index("by_item", ["itemId"]),

  files: defineTable({
    storageId: v.id("_storage"),
    filename: v.string(),
    size: v.number(),
  }),

  tasks: defineTable({
    type: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("cancelled")),
    scheduledId: v.optional(v.id("_scheduled_functions")),
    data: v.any(),
  }).index("by_status", ["status"]),

  sessions: defineTable({
    token: v.string(),
    userId: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),
})
