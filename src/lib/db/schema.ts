import { pgTable, text, timestamp, uuid, real, integer } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

export const graphs = pgTable("graphs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const nodes = pgTable("nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  graphId: uuid("graph_id").notNull().references(() => graphs.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  detail: text("detail"),
  x: real("x").notNull(),
  y: real("y").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const edges = pgTable("edges", {
  id: uuid("id").primaryKey().defaultRandom(),
  graphId: uuid("graph_id").notNull().references(() => graphs.id, { onDelete: "cascade" }),
  sourceNodeId: uuid("source_node_id").notNull().references(() => nodes.id, { onDelete: "cascade" }),
  targetNodeId: uuid("target_node_id").notNull().references(() => nodes.id, { onDelete: "cascade" }),
  detail: text("detail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Relations
export const graphsRelations = relations(graphs, ({ many }) => ({
  nodes: many(nodes),
  edges: many(edges),
}))

export const nodesRelations = relations(nodes, ({ one, many }) => ({
  graph: one(graphs, {
    fields: [nodes.graphId],
    references: [graphs.id],
  }),
  sourceEdges: many(edges, {
    relationName: "sourceNode",
  }),
  targetEdges: many(edges, {
    relationName: "targetNode",
  }),
}))

export const edgesRelations = relations(edges, ({ one }) => ({
  graph: one(graphs, {
    fields: [edges.graphId],
    references: [graphs.id],
  }),
  sourceNode: one(nodes, {
    fields: [edges.sourceNodeId],
    references: [nodes.id],
    relationName: "sourceNode",
  }),
  targetNode: one(nodes, {
    fields: [edges.targetNodeId],
    references: [nodes.id],
    relationName: "targetNode",
  }),
}))
