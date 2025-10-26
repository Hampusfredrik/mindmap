"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function AppPage() {
  const [userGraphs, setUserGraphs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchGraphs = async () => {
      try {
        const response = await fetch("/api/graph")
        if (response.ok) {
          const graphs = await response.json()
          setUserGraphs(graphs)
        }
      } catch (error) {
        console.error("Failed to fetch graphs:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchGraphs()
  }, [])
  
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="text-lg text-white">Loading your mindmaps...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Your Mindmaps
        </h1>
        <p className="text-gray-300">
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
          <h3 className="text-lg font-medium text-white mb-2">
            No mindmaps yet
          </h3>
          <p className="text-gray-400 mb-6">
            Get started by creating your first mindmap
          </p>
          <button
            onClick={async () => {
              try {
                console.log("Creating new mindmap...")
                const response = await fetch("/api/graph", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title: "New Mindmap" }),
                })
                console.log("Response status:", response.status)
                if (response.ok) {
                  const graph = await response.json()
                  console.log("Graph created:", graph)
                  window.location.href = `/app/${graph.id}`
                } else {
                  const errorText = await response.text()
                  console.error("Failed to create mindmap:", errorText)
                  alert(`Failed to create mindmap: ${response.status}`)
                }
              } catch (error) {
                console.error("Error creating mindmap:", error)
                alert("Failed to create mindmap: " + (error instanceof Error ? error.message : String(error)))
              }
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Create your first mindmap
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userGraphs.map((graph: any) => (
            <Link
              key={graph.id}
              href={`/app/${graph.id}`}
              className="block bg-gray-800 rounded-lg shadow hover:bg-gray-700 border border-gray-700 transition-all duration-200 p-6"
            >
              <h3 className="text-lg font-medium text-white mb-2">
                {graph.title}
              </h3>
              <p className="text-sm text-gray-400">
                Created {new Date(graph.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
