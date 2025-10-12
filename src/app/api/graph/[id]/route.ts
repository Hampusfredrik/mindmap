import { NextRequest, NextResponse } from "next/server"
import { requireAuth, verifyGraphOwnership } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { graphs, nodes, edges } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth()
  
  if (session instanceof NextResponse) {
    return session
  }
  
  const graph = await verifyGraphOwnership(params.id, session.user.id!)
  
  if (graph instanceof NextResponse) {
    return graph
  }
  
  // Get nodes and edges for this graph
  const graphNodes = await db
    .select()
    .from(nodes)
    .where(eq(nodes.graphId, params.id))
  
  const graphEdges = await db
    .select()
    .from(edges)
    .where(eq(edges.graphId, params.id))
  
  return NextResponse.json({
    graph,
    nodes: graphNodes,
    edges: graphEdges,
  })
}
