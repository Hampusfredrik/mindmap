import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { graphs } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { MindmapEditor } from "@/components/mindmap-editor"

interface PageProps {
  params: { id: string }
}

export default async function GraphPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect("/")
  }
  
  const graph = await db
    .select()
    .from(graphs)
    .where(eq(graphs.id, params.id))
    .limit(1)
  
  if (graph.length === 0) {
    notFound()
  }
  
  if (graph[0].userId !== session.user.id) {
    redirect("/app")
  }
  
  return (
    <div className="h-screen">
      <MindmapEditor graphId={params.id} graphTitle={graph[0].title} />
    </div>
  )
}
