import {defineSchema, defineTable} from "convex/server"
import {v} from "convex/values"

export default defineSchema({
  items: defineTable({
    name: v.string(),
    category: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    priority: v.number(),
    content: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_status", ["status"])
    .index("by_category_status", ["category", "status"])
    .index("by_category_priority", ["category", "priority"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["category", "status"],
    }),

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
})
