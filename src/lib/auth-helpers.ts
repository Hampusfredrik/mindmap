import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await getSession()
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
  
  return session
}

export async function verifyGraphOwnership(graphId: string, userId: string) {
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
}
