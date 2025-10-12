import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { updateEdgeSchema } from "@/lib/validations"
import { db } from "@/lib/db"
import { edges, graphs } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth()
  
  if (session instanceof NextResponse) {
    return session
  }
  
  try {
    const body = await request.json()
    const { id, updatedAt, ...updateData } = updateEdgeSchema.parse({ ...body, id: params.id })
    
    // Get the edge to verify ownership through graph
    const existingEdge = await db
      .select({
        edge: edges,
        graph: graphs,
      })
      .from(edges)
      .innerJoin(graphs, eq(edges.graphId, graphs.id))
      .where(eq(edges.id, params.id))
      .limit(1)
    
    if (existingEdge.length === 0) {
      return NextResponse.json(
        { error: "Edge not found" },
        { status: 404 }
      )
    }
    
    if (existingEdge[0].graph.userId !== session.user.id!) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }
    
    // OCC check if updatedAt is provided
    if (updatedAt) {
      const edgeUpdatedAt = existingEdge[0].edge.updatedAt.toISOString()
      if (edgeUpdatedAt !== updatedAt) {
        return NextResponse.json(
          { error: "Concurrent modification detected" },
          { status: 409 }
        )
      }
    }
    
    const [updatedEdge] = await db
      .update(edges)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(edges.id, params.id))
      .returning()
    
    return NextResponse.json(updatedEdge)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth()
  
  if (session instanceof NextResponse) {
    return session
  }
  
  // Get the edge to verify ownership through graph
  const existingEdge = await db
    .select({
      edge: edges,
      graph: graphs,
    })
    .from(edges)
    .innerJoin(graphs, eq(edges.graphId, graphs.id))
    .where(eq(edges.id, params.id))
    .limit(1)
  
  if (existingEdge.length === 0) {
    return NextResponse.json(
      { error: "Edge not found" },
      { status: 404 }
    )
  }
  
  if (existingEdge[0].graph.userId !== session.user.id!) {
    return NextResponse.json(
      { error: "Access denied" },
      { status: 403 }
    )
  }
  
  await db.delete(edges).where(eq(edges.id, params.id))
  
  return NextResponse.json({ success: true })
}
