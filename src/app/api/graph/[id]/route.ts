import { NextRequest, NextResponse } from "next/server"
import { requireAuth, verifyGraphOwnership } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { nodes, edges } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth()
  
  if (session instanceof NextResponse) {
    return session
  }
  
  const resolvedParams = await params
  const graph = await verifyGraphOwnership(resolvedParams.id, session.user!.id!)
  
  if (graph instanceof NextResponse) {
    return graph
  }
  
  // Get nodes and edges for this graph
  const graphNodes = await db
    .select()
    .from(nodes)
    .where(eq(nodes.graphId, resolvedParams.id))
  
  const graphEdges = await db
    .select()
    .from(edges)
    .where(eq(edges.graphId, resolvedParams.id))
  
  return NextResponse.json({
    graph,
    nodes: graphNodes,
    edges: graphEdges,
  })
}
