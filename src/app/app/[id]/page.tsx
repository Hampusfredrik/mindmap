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
  const graph = await db
    .select()
    .from(graphs)
    .where(eq(graphs.id, resolvedParams.id))
    .limit(1)
  
  if (graph.length === 0) {
    notFound()
  }
  
  // Skip ownership check for now - will add back with auth
  // if (graph[0].userId !== userId) {
  //   redirect("/app")
  // }
  
  return (
    <div className="h-screen">
      <MindmapEditor graphId={resolvedParams.id} graphTitle={graph[0].title} />
    </div>
  )
}
