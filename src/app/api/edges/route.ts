import { NextRequest, NextResponse } from "next/server"
import { requireAuth, verifyGraphOwnership } from "@/lib/auth-helpers"
import { createEdgeSchema } from "@/lib/validations"
import { db } from "@/lib/db"
import { edges } from "@/lib/db/schema"
import { z } from "zod"

export async function POST(request: NextRequest) {
  const session = await requireAuth()
  
  if (session instanceof NextResponse) {
    return session
  }
  
  try {
    const body = await request.json()
    const { graphId, sourceNodeId, targetNodeId, detail } = createEdgeSchema.parse(body)
    
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
