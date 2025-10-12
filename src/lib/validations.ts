import { z } from "zod"

export const createGraphSchema = z.object({
  title: z.string().min(1, "Title is required"),
})

export const createNodeSchema = z.object({
  graphId: z.string().min(1, "Graph ID is required"),
  title: z.string().min(1, "Title is required"),
  x: z.number(),
  y: z.number(),
  detail: z.string().optional(),
})

export const updateNodeSchema = z.object({
  id: z.string().min(1, "ID is required"),
  title: z.string().min(1, "Title is required").optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  detail: z.string().optional(),
  updatedAt: z.string().datetime().optional(), // For OCC
})

export const createEdgeSchema = z.object({
  graphId: z.string().min(1, "Graph ID is required"),
  sourceNodeId: z.string().min(1, "Source node ID is required"),
  targetNodeId: z.string().min(1, "Target node ID is required"),
  detail: z.string().optional(),
})

export const updateEdgeSchema = z.object({
  id: z.string().min(1, "ID is required"),
  detail: z.string().optional(),
  updatedAt: z.string().datetime().optional(), // For OCC
})

export type CreateGraphInput = z.infer<typeof createGraphSchema>
export type CreateNodeInput = z.infer<typeof createNodeSchema>
export type UpdateNodeInput = z.infer<typeof updateNodeSchema>
export type CreateEdgeInput = z.infer<typeof createEdgeSchema>
export type UpdateEdgeInput = z.infer<typeof updateEdgeSchema>
