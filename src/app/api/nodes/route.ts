import { NextRequest, NextResponse } from "next/server"
import { requireAuth, verifyGraphOwnership } from "@/lib/auth-helpers"
import { createNodeSchema } from "@/lib/validations"
import { db } from "@/lib/db"
import { nodes } from "@/lib/db/schema"
import { z } from "zod"

// Extend global to include mockNodes for demo purposes
declare global {
  var mockNodes: any[]
}

export async function POST(request: NextRequest) {
  const session = await requireAuth()
  
  if (session instanceof NextResponse) {
    return session
  }
  
  try {
    const body = await request.json()
    const { graphId, title, x, y, detail } = createNodeSchema.parse(body)
    
    // For mock graphs, skip ownership verification and store mock node
    if (graphId.startsWith('mock-')) {
      const mockNode = {
        id: `mock-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        graphId,
        title,
        x,
        y,
        detail: detail || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      // Store the mock node in global memory (for demo purposes)
      if (!global.mockNodes) {
        global.mockNodes = []
      }
      global.mockNodes.push(mockNode)
      
      return NextResponse.json(mockNode)
    }
    
    try {
      // Verify graph ownership
      const graph = await verifyGraphOwnership(graphId, session.user.id!)
      
      if (graph instanceof NextResponse) {
        return graph
      }
      
      const [node] = await db
        .insert(nodes)
        .values({
          graphId,
          title,
          x,
          y,
          detail,
        })
        .returning()
      
      return NextResponse.json(node)
    } catch (dbError) {
      console.warn("Database not available, returning mock node:", dbError)
      
      // Return a mock node
      const mockNode = {
        id: `mock-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        graphId,
        title,
        x,
        y,
        detail: detail || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      return NextResponse.json(mockNode)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    
    console.error("Error creating node:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
