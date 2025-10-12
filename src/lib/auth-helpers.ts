import { NextResponse } from "next/server"

// Temporary mock user for development
export async function getSession() {
  return {
    user: {
      id: "dev-user-123",
      name: "Development User",
      email: "dev@example.com",
      image: null
    }
  }
}

export async function requireAuth() {
  // Always return mock user for now
  return {
    user: {
      id: "dev-user-123",
      name: "Development User",
      email: "dev@example.com",
      image: null
    }
  }
}

export async function verifyGraphOwnership(graphId: string, userId: string) {
  // For mock graphs, always allow access
  if (graphId.startsWith('mock-')) {
    return {
      id: graphId,
      title: "New Mindmap",
      userId: userId,
      createdAt: new Date().toISOString(),
    }
  }
  
  try {
    const { db } = await import("@/lib/db")
    const { graphs } = await import("@/lib/db/schema")
    const { eq, and } = await import("drizzle-orm")
    
    const graph = await db
      .select()
      .from(graphs)
      .where(and(eq(graphs.id, graphId), eq(graphs.userId, userId)))
      .limit(1)
    
    if (graph.length === 0) {
      return NextResponse.json(
        { error: "Graph not found or access denied" },
        { status: 404 }
      )
    }
    
    return graph[0]
  } catch (error) {
    console.warn("Database not available for ownership verification:", error)
    // Return mock graph for any ID when database is unavailable
    return {
      id: graphId,
      title: "New Mindmap",
      userId: userId,
      createdAt: new Date().toISOString(),
    }
  }
}
