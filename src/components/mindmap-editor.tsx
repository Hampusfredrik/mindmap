"use client"

import { useState, useMemo, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

interface MindmapEditorProps {
  graphId: string
  graphTitle: string
}

interface GraphData {
  graph: {
    id: string
    title: string
    userId: string
    createdAt: string
  }
  nodes: Array<{
    id: string
    graphId: string
    title: string
    detail?: string
    x: number
    y: number
    createdAt: string
    updatedAt: string
  }>
  edges: Array<{
    id: string
    graphId: string
    sourceNodeId: string
    targetNodeId: string
    detail?: string
    createdAt: string
    updatedAt: string
  }>
}

// Simple types for now (without ReactFlow)
interface SimpleNode {
  id: string
  position: { x: number; y: number }
  data: {
    label: string
    detail?: string
    updatedAt: string
  }
}

interface SimpleEdge {
  id: string
  source: string
  target: string
  data: {
    detail?: string
    updatedAt: string
  }
}

export function MindmapEditor({ graphId, graphTitle }: MindmapEditorProps) {
  const queryClient = useQueryClient()

  // Fetch graph data
  const { data: graphData, isLoading, error } = useQuery<GraphData>({
    queryKey: ["graph", graphId],
    queryFn: async () => {
      console.log("Fetching graph data for ID:", graphId)
      const response = await fetch(`/api/graph/${graphId}`)
      console.log("Response status:", response.status)
      if (!response.ok) {
        const errorText = await response.text()
        console.error("API Error:", errorText)
        throw new Error(`Failed to fetch graph: ${response.status}`)
      }
      const data = await response.json()
      console.log("Graph data received:", data)
      return data
    },
  })

  // Convert API data to simple format
  const nodes: SimpleNode[] = useMemo(() => {
    if (!graphData?.nodes) return []
    return graphData.nodes.map((node) => ({
      id: node.id,
      position: { x: node.x, y: node.y },
      data: {
        label: node.title,
        detail: node.detail,
        updatedAt: node.updatedAt,
      },
    }))
  }, [graphData?.nodes])

  const edges: SimpleEdge[] = useMemo(() => {
    if (!graphData?.edges) return []
    return graphData.edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      data: {
        detail: edge.detail,
        updatedAt: edge.updatedAt,
      },
    }))
  }, [graphData?.edges])

  // Simple mutation for creating nodes (for testing)
  const createNodeMutation = useMutation({
    mutationFn: async (data: { x: number; y: number; title: string }) => {
      const response = await fetch("/api/nodes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          graphId,
          title: data.title,
          x: data.x,
          y: data.y,
        }),
      })
      if (!response.ok) throw new Error("Failed to create node")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graph", graphId] })
      toast.success("Node created")
    },
    onError: () => {
      toast.error("Failed to create node")
    },
  })

  // Simple function to add a test node
  const addTestNode = () => {
    createNodeMutation.mutate({
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
      title: "Test Node " + (nodes.length + 1),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading mindmap...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-red-500">Error loading mindmap</div>
        <div className="text-sm text-gray-500 mt-2">
          {error.message}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          Graph ID: {graphId}
        </div>
      </div>
    )
  }

  if (!graphData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-red-500">Failed to load mindmap</div>
        <div className="text-sm text-gray-500 mt-2">
          Graph ID: {graphId}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-gray-100">
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Mindmap Editor</h2>
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <p className="text-gray-600">Graph ID: {graphId}</p>
          <p className="text-gray-600">Title: {graphData.graph.title}</p>
          <p className="text-gray-600">Nodes: {nodes.length}</p>
          <p className="text-gray-600">Edges: {edges.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Nodes:</h3>
            <button
              onClick={addTestNode}
              disabled={createNodeMutation.isPending}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {createNodeMutation.isPending ? "Creating..." : "Add Test Node"}
            </button>
          </div>
          
          {nodes.length === 0 ? (
            <p className="text-gray-500">No nodes yet. Click "Add Test Node" to create one.</p>
          ) : (
            <div className="space-y-2">
              {nodes.map((node) => (
                <div key={node.id} className="p-3 border rounded bg-gray-50">
                  <div className="font-medium">{node.data.label}</div>
                  <div className="text-sm text-gray-500">
                    Position: ({node.position.x}, {node.position.y})
                  </div>
                  {node.data.detail && (
                    <div className="text-sm text-gray-600 mt-1">
                      Detail: {node.data.detail}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="font-semibold mb-2">Edges:</h3>
          {edges.length === 0 ? (
            <p className="text-gray-500">No connections yet.</p>
          ) : (
            <div className="space-y-2">
              {edges.map((edge) => (
                <div key={edge.id} className="p-2 border rounded bg-gray-50">
                  <div className="text-sm">
                    {edge.source} → {edge.target}
                  </div>
                  {edge.data.detail && (
                    <div className="text-sm text-gray-600 mt-1">
                      Detail: {edge.data.detail}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-4">
          <p className="text-blue-800">
            <strong>Simplified View</strong><br/>
            This is a simplified version to test the basic functionality.
            React Flow has been temporarily disabled to isolate any rendering issues.
            Once this works, we'll re-enable the full interactive editor.
          </p>
        </div>
      </div>
    </div>
  )
}