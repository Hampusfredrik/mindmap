"use client"

import { useCallback, useState, useMemo, useEffect } from "react"
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  EdgeTypes,
  ReactFlowProvider,
} from "reactflow"
import "reactflow/dist/style.css"
import { CustomNode } from "./custom-node"
import { CustomEdge } from "./custom-edge"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { debounce } from "lodash"

const nodeTypes: NodeTypes = {
  custom: CustomNode,
}

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
}

interface MindmapEditorProps {
  graphId: string
  graphTitle: string
}

function MindmapEditorInner({ graphId, graphTitle }: MindmapEditorProps) {
  const queryClient = useQueryClient()
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [performanceMode, setPerformanceMode] = useState(false)

  // Fetch graph data
  const { data: graphData, isLoading } = useQuery({
    queryKey: ["graph", graphId],
    queryFn: async () => {
      const response = await fetch(`/api/graph/${graphId}`)
      if (!response.ok) throw new Error("Failed to fetch graph")
      return response.json()
    },
  })

  // Convert API data to React Flow format
  const initialNodes: Node[] = useMemo(() => {
    if (!graphData?.nodes) return []
    return graphData.nodes.map((node: any) => ({
      id: node.id,
      type: "custom",
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
    return graphData.edges.map((edge: any) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      type: "custom",
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

  // Performance mode toggle
  useEffect(() => {
    const shouldUsePerformanceMode = nodes.length > 50 || edges.length > 100
    setPerformanceMode(shouldUsePerformanceMode)
  }, [nodes.length, edges.length])

  // Mutations
  const createNodeMutation = useMutation({
    mutationFn: async (data: { x: number; y: number; title: string }) => {
      const response = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const updateNodeMutation = useMutation({
    mutationFn: async (data: { id: string; x?: number; y?: number; title?: string; detail?: string; updatedAt?: string }) => {
      const response = await fetch(`/api/nodes/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("CONCURRENT_MODIFICATION")
        }
        throw new Error("Failed to update node")
      }
      return response.json()
    },
    onError: (error) => {
      if (error.message === "CONCURRENT_MODIFICATION") {
        toast.error("Other changes detected. Please reload and try again.")
      } else {
        toast.error("Failed to update node")
      }
    },
  })

  const createEdgeMutation = useMutation({
    mutationFn: async (data: { sourceNodeId: string; targetNodeId: string }) => {
      const response = await fetch("/api/edges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          graphId,
          sourceNodeId: data.sourceNodeId,
          targetNodeId: data.targetNodeId,
        }),
      })
      if (!response.ok) throw new Error("Failed to create edge")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graph", graphId] })
      toast.success("Connection created")
    },
    onError: () => {
      toast.error("Failed to create connection")
    },
  })

  // Debounced position update
  const debouncedUpdatePosition = useMemo(
    () => debounce((nodeId: string, x: number, y: number, updatedAt: string) => {
      updateNodeMutation.mutate({ id: nodeId, x, y, updatedAt })
    }, 400),
    [updateNodeMutation]
  )

  // Event handlers
  const onNodeDragStop = useCallback((event: any, node: Node) => {
    const nodeData = nodes.find(n => n.id === node.id)?.data
    if (nodeData?.updatedAt) {
      debouncedUpdatePosition(node.id, node.position.x, node.position.y, nodeData.updatedAt)
    }
  }, [nodes, debouncedUpdatePosition])

  const onNodeClick = useCallback((event: any, node: Node) => {
    if (selectedNode === node.id) {
      // Second click - create edge if we have a source
      if (selectedNode) {
        createEdgeMutation.mutate({
          sourceNodeId: selectedNode,
          targetNodeId: node.id,
        })
        setSelectedNode(null)
      }
    } else {
      // First click - set as source
      setSelectedNode(node.id)
    }
  }, [selectedNode, createEdgeMutation])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const onConnect = useCallback((params: Connection) => {
    if (params.source && params.target) {
      createEdgeMutation.mutate({
        sourceNodeId: params.source,
        targetNodeId: params.target,
      })
    }
  }, [createEdgeMutation])

  const onNodeDoubleClick = useCallback((event: any, node: Node) => {
    // Add new node near double-clicked node
    const newNodeX = node.position.x + 200
    const newNodeY = node.position.y
    
    createNodeMutation.mutate({
      x: newNodeX,
      y: newNodeY,
      title: "New Node",
    })
  }, [createNodeMutation])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading mindmap...</div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        {!performanceMode && <MiniMap />}
      </ReactFlow>
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
