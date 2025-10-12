import { db } from "@/lib/db"
import { graphs } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import Link from "next/link"

export default async function AppPage() {
  // Mock user ID for development
  const userId = "dev-user-123"
  
  const userGraphs = await db
    .select()
    .from(graphs)
    .where(eq(graphs.userId, userId))
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Your Mindmaps
        </h1>
        <p className="text-gray-600">
          Create and manage your interactive mindmaps
        </p>
      </div>
      
      {userGraphs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No mindmaps yet
          </h3>
          <p className="text-gray-500 mb-6">
            Get started by creating your first mindmap
          </p>
          <Link
            href="/api/graph"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Create your first mindmap
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userGraphs.map((graph: any) => (
            <Link
              key={graph.id}
              href={`/app/${graph.id}`}
              className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200 p-6"
            >
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {graph.title}
              </h3>
              <p className="text-sm text-gray-500">
                Created {new Date(graph.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
