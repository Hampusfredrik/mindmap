"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { CustomNode } from "./custom-node"
import { CustomEdge } from "./custom-edge"
import { X, Plus } from "lucide-react"

const nodeTypes: NodeTypes = {
  default: CustomNode,
}

const edgeTypes: EdgeTypes = {
  default: CustomEdge,
}

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
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null)
  const [performanceMode, setPerformanceMode] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { fitView } = useReactFlow()

  // Detect mobile and performance mode
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
        graphId: graphId,
      },
    }))
  }, [graphData?.nodes, graphId])

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
          graphId: graphId,
        },
      }))
    }, [graphData?.edges, graphId])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes when data changes
  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

  // Performance mode detection
  useEffect(() => {
    setPerformanceMode(nodes.length > 50 || edges.length > 100)
  }, [nodes.length, edges.length])

  // Mobile read-only mode
  const [isEditingEnabled, setIsEditingEnabled] = useState(!isMobile)

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

  // Edge creation mutation
  const createEdgeMutation = useMutation({
    mutationFn: async (data: { sourceNodeId: string; targetNodeId: string }) => {
      const response = await fetch("/api/edges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      setSelectedNode(null)
    },
    onError: () => {
      toast.error("Failed to create connection")
    },
  })

  // Track if we're in connection mode
  const [isConnecting, setIsConnecting] = useState(false)

  // React Flow event handlers
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (!isEditingEnabled) {
      // In read-only mode, open detail sheet
      setSelectedNodeData(node.data)
      setDetailSheetOpen(true)
      return
    }

    // Prevent node click from interfering with inline editing
    // Nodes handle their own editing now
    if (!isConnecting) {
      setSelectedNode(node.id)
      setIsConnecting(true)
      setSelectedNodeData(node.data)
    } else if (selectedNode && selectedNode !== node.id) {
      // Second click on different node - create edge
      createEdgeMutation.mutate({
        sourceNodeId: selectedNode,
        targetNodeId: node.id,
      })
      setIsConnecting(false)
      setSelectedNode(null)
    }
  }, [selectedNode, createEdgeMutation, isEditingEnabled, isConnecting])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    setIsConnecting(false)
  }, [])

  // Node detail update mutation
  const updateNodeDetailMutation = useMutation({
    mutationFn: async (data: { id: string; detail: string; updatedAt: string }) => {
      const response = await fetch(`/api/nodes/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to update node detail")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graph", graphId] })
      toast.success("Node details updated")
    },
    onError: () => {
      toast.error("Failed to update node details")
    },
  })

  // Node position update mutation
  const updateNodePositionMutation = useMutation({
    mutationFn: async (data: { id: string; x: number; y: number; updatedAt: string }) => {
      const response = await fetch(`/api/nodes/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        // Don't show error for missing nodes during position updates (likely mock reset)
        if (response.status !== 404) {
          throw new Error("Failed to update node position")
        }
        return null
      }
      return response.json()
    },
    onError: () => {
      toast.error("Failed to save node position")
    },
  })

  const onNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    // Update node position in database
    const nodeData = nodes.find(n => n.id === node.id)?.data
    if (nodeData?.updatedAt) {
      updateNodePositionMutation.mutate({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        updatedAt: nodeData.updatedAt,
      })
    }
  }, [nodes, updateNodePositionMutation])

  // Delete node mutation
  const deleteNodeMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      const response = await fetch(`/api/nodes/${nodeId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete node")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graph", graphId] })
      toast.success("Node deleted")
      setSelectedNode(null)
    },
    onError: () => {
      toast.error("Failed to delete node")
    },
  })

  // Delete edge mutation
  const deleteEdgeMutation = useMutation({
    mutationFn: async (edgeId: string) => {
      const response = await fetch(`/api/edges/${edgeId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete connection")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graph", graphId] })
      toast.success("Connection deleted")
    },
    onError: () => {
      toast.error("Failed to delete connection")
    },
  })

  // Simple function to add a test node
  const addTestNode = () => {
    createNodeMutation.mutate({
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
      title: "New Node " + (nodes.length + 1),
    })
  }

  // Delete selected node
  const handleDeleteNode = () => {
    if (selectedNode) {
      deleteNodeMutation.mutate(selectedNode)
    }
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNode && isEditingEnabled) {
          e.preventDefault()
          deleteNodeMutation.mutate(selectedNode)
        }
      } else if (e.key === 'Escape') {
        setIsConnecting(false)
        setSelectedNode(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNode, isEditingEnabled, deleteNodeMutation])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1a1a1a]">
        <div className="text-lg text-white">Loading mindmap...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1a1a1a]">
        <div className="text-lg text-red-400">Error loading mindmap</div>
        <div className="text-sm text-gray-400 mt-2">
          {error.message}
        </div>
        <div className="text-sm text-gray-400 mt-1">
          Graph ID: {graphId}
        </div>
      </div>
    )
  }

  if (!graphData) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1a1a1a]">
        <div className="text-lg text-red-400">Failed to load mindmap</div>
        <div className="text-sm text-gray-400 mt-2">
          Graph ID: {graphId}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full relative bg-[#1a1a1a]">
      {/* Mobile editing toggle */}
      {isMobile && (
        <div className="absolute top-4 left-4 right-4 z-20 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-white">
              {isEditingEnabled ? "Editing Mode" : "Read-Only Mode"}
            </span>
            <Button
              onClick={() => setIsEditingEnabled(!isEditingEnabled)}
              size="sm"
              variant={isEditingEnabled ? "destructive" : "default"}
            >
              {isEditingEnabled ? "Disable Editing" : "Enable Editing"}
            </Button>
          </div>
        </div>
      )}

      {/* Header with controls */}
      <div className={`absolute z-10 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4 ${
        isMobile ? 'top-20 left-4 right-4' : 'top-4 left-4'
      }`}>
        <h2 className="text-lg font-bold mb-2 text-white">Mindmap Editor</h2>
        <div className="text-sm text-gray-300 space-y-1">
          <p>Title: {graphData.graph.title}</p>
          <p>Nodes: {nodes.length}</p>
          <p>Edges: {edges.length}</p>
          {performanceMode && <p className="text-orange-400 font-medium">Performance Mode</p>}
          {isConnecting && <p className="text-blue-400 font-medium">Select target node...</p>}
        </div>
        
        <div className="mt-3 space-y-2">
          <Button 
            onClick={addTestNode}
            disabled={createNodeMutation.isPending || !isEditingEnabled}
            className="w-full"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {createNodeMutation.isPending ? "Creating..." : "Add Node"}
          </Button>
          
          {selectedNode && isEditingEnabled && (
            <Button 
              onClick={handleDeleteNode}
              disabled={deleteNodeMutation.isPending}
              variant="destructive"
              className="w-full"
              size="sm"
            >
              <X className="h-4 w-4 mr-2" />
              Delete Node (Del)
            </Button>
          )}
        </div>
        
        {/* Connection instructions */}
        {isEditingEnabled && (
          <div className="mt-3 text-xs text-gray-400">
            <p><strong>To connect:</strong> Click node, then another</p>
            <p><strong>To delete:</strong> Select node and press Del</p>
            <p><strong>To cancel:</strong> Press Esc</p>
          </div>
        )}
      </div>

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
        nodesDraggable={isEditingEnabled}
        nodesConnectable={isEditingEnabled}
        elementsSelectable={isEditingEnabled}
        defaultEdgeOptions={{
          type: performanceMode ? 'straight' : 'smoothstep',
          animated: !performanceMode,
          style: { strokeWidth: 2, stroke: '#9ca3af' },
        }}
      >
        <Background color="#404040" gap={20} size={1} />
        <Controls />
        {!performanceMode && <MiniMap nodeColor="#3b82f6" />}
      </ReactFlow>

      {/* Instructions */}
      <div className={`absolute z-10 bg-gray-800 border border-gray-700 rounded-lg p-3 ${
        isMobile ? 'bottom-4 left-4 right-4' : 'bottom-4 left-4 max-w-sm'
      }`}>
        <p className="text-white text-sm">
          <strong>Interactive Mindmap</strong><br/>
          {isEditingEnabled ? (
            <span className="text-gray-300">
              • Click to select nodes<br/>
              • Click two nodes to connect<br/>
              • Click selected node to edit details<br/>
              • Drag to move nodes
            </span>
          ) : (
            <span className="text-gray-300">
              • Click nodes to view details<br/>
              • Use controls to zoom/pan<br/>
              • Enable editing to modify
            </span>
          )}
        </p>
      </div>

      {/* Node Detail Sheet */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className={isMobile ? "w-full" : "w-[400px]"}>
          <SheetHeader>
            <SheetTitle>{selectedNodeData?.label || "Node Details"}</SheetTitle>
            <SheetDescription>
              Add detailed information about this concept
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Textarea
                placeholder="Enter detailed information about this concept..."
                value={selectedNodeData?.detail || ""}
                onChange={(e) => {
                  if (selectedNodeData) {
                    setSelectedNodeData({
                      ...selectedNodeData,
                      detail: e.target.value
                    })
                  }
                }}
                className="mt-2 min-h-[200px]"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (selectedNodeData && selectedNode) {
                    const node = nodes.find(n => n.id === selectedNode)
                    if (node?.data?.updatedAt) {
                      updateNodeDetailMutation.mutate({
                        id: selectedNode,
                        detail: selectedNodeData.detail || "",
                        updatedAt: node.data.updatedAt,
                      })
                    }
                  }
                  setDetailSheetOpen(false)
                }}
                disabled={updateNodeDetailMutation.isPending}
                className="flex-1"
              >
                {updateNodeDetailMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setDetailSheetOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
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