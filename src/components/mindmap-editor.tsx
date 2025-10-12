"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import ReactFlow, {
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  EdgeTypes,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow"
import "reactflow/dist/style.css"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

// Simple custom node component
function CustomNode({ data, id }: { data: any; id: string }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-400 cursor-pointer hover:border-blue-500">
      <div className="font-bold">{data.label}</div>
      {data.detail && (
        <div className="text-xs text-gray-500 mt-1">{data.detail}</div>
      )}
    </div>
  )
}

const nodeTypes: NodeTypes = {
  default: CustomNode,
}

const edgeTypes: EdgeTypes = {}

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

// React Flow types
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

function MindmapEditorInner({ graphId, graphTitle }: MindmapEditorProps) {
  const queryClient = useQueryClient()
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const { fitView } = useReactFlow()

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

  // Convert API data to React Flow format
  const initialNodes: Node[] = useMemo(() => {
    if (!graphData?.nodes) return []
    return graphData.nodes.map((node) => ({
      id: node.id,
      type: "default",
      position: { x: node.x, y: node.y },
      data: {
        label: node.title,
        detail: node.detail,
        updatedAt: node.updatedAt,
      },
    }))
  }, [graphData?.nodes])

  const initialEdges: Edge[] = useMemo(() => {
    if (!graphData?.edges) return []
    return graphData.edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      type: "default",
      data: {
        detail: edge.detail,
        updatedAt: edge.updatedAt,
      },
    }))
  }, [graphData?.edges])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes when data changes
  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

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

  // React Flow event handlers
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (selectedNode === node.id) {
      setSelectedNode(null)
    } else {
      setSelectedNode(node.id)
    }
  }, [selectedNode])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    // Add new node near double-clicked node
    const newNodeX = node.position.x + 200
    const newNodeY = node.position.y

    createNodeMutation.mutate({
      x: newNodeX,
      y: newNodeY,
      title: "New Node",
    })
  }, [createNodeMutation])

  const onNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    // TODO: Update node position in database
    console.log("Node dragged to:", node.position)
  }, [])

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
    <div className="h-full w-full relative">
      {/* Header with controls */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4">
        <h2 className="text-lg font-bold mb-2">Mindmap Editor</h2>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Title: {graphData.graph.title}</p>
          <p>Nodes: {nodes.length}</p>
          <p>Edges: {edges.length}</p>
        </div>
        <Button 
          onClick={addTestNode}
          disabled={createNodeMutation.isPending}
          className="mt-3 w-full"
          size="sm"
        >
          {createNodeMutation.isPending ? "Creating..." : "Add Node"}
        </Button>
      </div>

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10 bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-sm">
        <p className="text-blue-800 text-sm">
          <strong>Interactive Mindmap</strong><br/>
          • Click to select nodes<br/>
          • Double-click to add new nodes<br/>
          • Drag to move nodes<br/>
          • Use controls to zoom/pan
        </p>
      </div>
    </div>
  )
}

export function MindmapEditor(props: MindmapEditorProps) {
  return (
    <ReactFlowProvider>
      <MindmapEditorInner {...props} />
    </ReactFlowProvider>
  )
}