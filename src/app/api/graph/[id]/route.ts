import { NextRequest, NextResponse } from "next/server"
import { requireAuth, verifyGraphOwnership } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { nodes, edges } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

// Extend global to include mockNodes and mockEdges for demo purposes
declare global {
  var mockNodes: any[]
  var mockEdges: any[]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth()
  
  if (session instanceof NextResponse) {
    return session
  }
  
  const resolvedParams = await params
  
  // For mock graphs, skip ownership verification and return stored mock data
  if (resolvedParams.id.startsWith('mock-')) {
    const mockGraph = {
      id: resolvedParams.id,
      title: "New Mindmap",
      userId: session.user!.id!,
      createdAt: new Date().toISOString(),
    }
    
    // Get mock nodes and edges from a simple in-memory store
    // In a real app, this would come from the database
    const mockNodes = global.mockNodes || []
    const mockEdges = global.mockEdges || []
    const graphMockNodes = mockNodes.filter((node: any) => node.graphId === resolvedParams.id)
    const graphMockEdges = mockEdges.filter((edge: any) => edge.graphId === resolvedParams.id)
    
    return NextResponse.json({
      graph: mockGraph,
      nodes: graphMockNodes,
      edges: graphMockEdges,
    })
  }
  
  try {
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
  } catch (error) {
    console.warn("Database not available, returning mock data:", error)
    
    // Return mock data for any graph ID
    const mockGraph = {
      id: resolvedParams.id,
      title: "New Mindmap",
      userId: session.user!.id!,
      createdAt: new Date().toISOString(),
    }
    
    // Get mock data
    const mockNodes = global.mockNodes || []
    const mockEdges = global.mockEdges || []
    const graphMockNodes = mockNodes.filter((node: any) => node.graphId === resolvedParams.id)
    const graphMockEdges = mockEdges.filter((edge: any) => edge.graphId === resolvedParams.id)
    
    return NextResponse.json({
      graph: mockGraph,
      nodes: graphMockNodes,
      edges: graphMockEdges,
    })
  }
}
