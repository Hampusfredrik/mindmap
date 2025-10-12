import { NextRequest, NextResponse } from "next/server"
import { requireAuth, verifyGraphOwnership } from "@/lib/auth-helpers"
import { createEdgeSchema } from "@/lib/validations"
import { db } from "@/lib/db"
import { edges } from "@/lib/db/schema"
import { z } from "zod"

// Extend global to include mockEdges for demo purposes
declare global {
  var mockEdges: any[]
}

export async function POST(request: NextRequest) {
  const session = await requireAuth()
  
  if (session instanceof NextResponse) {
    return session
  }
  
  try {
    const body = await request.json()
    const { graphId, sourceNodeId, targetNodeId, detail } = createEdgeSchema.parse(body)
    
    // For mock graphs, store mock edge
    if (graphId.startsWith('mock-')) {
      const mockEdge = {
        id: `mock-edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        graphId,
        sourceNodeId,
        targetNodeId,
        detail: detail || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      // Store the mock edge in global memory
      if (!global.mockEdges) {
        global.mockEdges = []
      }
      global.mockEdges.push(mockEdge)
      
      return NextResponse.json(mockEdge)
    }
    
    try {
      // Verify graph ownership
      const graph = await verifyGraphOwnership(graphId, session.user.id!)
      
      if (graph instanceof NextResponse) {
        return graph
      }
      
      const [edge] = await db
        .insert(edges)
        .values({
          graphId,
          sourceNodeId,
          targetNodeId,
          detail,
        })
        .returning()
      
      return NextResponse.json(edge)
    } catch (dbError) {
      console.warn("Database not available, returning mock edge:", dbError)
      
      // Return a mock edge
      const mockEdge = {
        id: `mock-edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        graphId,
        sourceNodeId,
        targetNodeId,
        detail: detail || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      return NextResponse.json(mockEdge)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    
    console.error("Error creating edge:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
