import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { graphs } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { MindmapEditor } from "@/components/mindmap-editor"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function GraphPage({ params }: PageProps) {
  // Mock user ID for development
  const userId = "dev-user-123"
  
  const resolvedParams = await params
  
  // Try to get graph from database, but handle errors gracefully
  let graphTitle = "New Mindmap"
  
  try {
    const graph = await db
      .select()
      .from(graphs)
      .where(eq(graphs.id, resolvedParams.id))
      .limit(1)
    
    if (graph.length > 0) {
      graphTitle = graph[0].title
    }
  } catch (error) {
    console.warn("Database not available, using default title:", error)
    // For mock graphs or when database is unavailable, use default title
  }
  
  return (
    <div className="h-screen">
      <MindmapEditor graphId={resolvedParams.id} graphTitle={graphTitle} />
    </div>
  )
}
