import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { updateNodeSchema } from "@/lib/validations"
import { db } from "@/lib/db"
import { nodes, graphs } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth()
  
  if (session instanceof NextResponse) {
    return session
  }
  
  try {
    const body = await request.json()
    const resolvedParams = await params
    const { updatedAt, ...updateData } = updateNodeSchema.parse({ ...body, id: resolvedParams.id })
    
    // Get the node to verify ownership through graph
    const existingNode = await db
      .select({
        node: nodes,
        graph: graphs,
      })
      .from(nodes)
      .innerJoin(graphs, eq(nodes.graphId, graphs.id))
      .where(eq(nodes.id, resolvedParams.id))
      .limit(1)
    
    if (existingNode.length === 0) {
      return NextResponse.json(
        { error: "Node not found" },
        { status: 404 }
      )
    }
    
    if (existingNode[0].graph.userId !== session.user!.id!) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }
    
    // OCC check if updatedAt is provided
    if (updatedAt) {
      const nodeUpdatedAt = existingNode[0].node.updatedAt.toISOString()
      if (nodeUpdatedAt !== updatedAt) {
        return NextResponse.json(
          { error: "Concurrent modification detected" },
          { status: 409 }
        )
      }
    }
    
    const [updatedNode] = await db
      .update(nodes)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(nodes.id, resolvedParams.id))
      .returning()
    
    return NextResponse.json(updatedNode)
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
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth()
  
  if (session instanceof NextResponse) {
    return session
  }
  
  // Get the node to verify ownership through graph
  const resolvedParams = await params
  const existingNode = await db
    .select({
      node: nodes,
      graph: graphs,
    })
    .from(nodes)
    .innerJoin(graphs, eq(nodes.graphId, graphs.id))
    .where(eq(nodes.id, resolvedParams.id))
    .limit(1)
  
  if (existingNode.length === 0) {
    return NextResponse.json(
      { error: "Node not found" },
      { status: 404 }
    )
  }
  
  if (existingNode[0].graph.userId !== session.user!.id!) {
    return NextResponse.json(
      { error: "Access denied" },
      { status: 403 }
    )
  }
  
  await db.delete(nodes).where(eq(nodes.id, resolvedParams.id))
  
  return NextResponse.json({ success: true })
}
