"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import ReactFlow, {
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
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
import { X, Plus, Link2, Link2Off } from "lucide-react"

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
    // For mock graphs, don't overwrite local state updates
    // This prevents losing optimistically added nodes/edges
    if (!graphId.startsWith('mock-')) {
      setNodes(initialNodes)
    }
    // For mock graphs, only set initialNodes on first load (when nodes is empty)
    else if (nodes.length === 0 && initialNodes.length > 0) {
      setNodes(initialNodes)
    }
  }, [initialNodes, setNodes, graphId])

  useEffect(() => {
    // Same logic for edges
    if (!graphId.startsWith('mock-')) {
      setEdges(initialEdges)
    } else if (edges.length === 0 && initialEdges.length > 0) {
      setEdges(initialEdges)
    }
  }, [initialEdges, setEdges, graphId])


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
      const newNode = await response.json()
      
      // For mock nodes, add to local nodes state to avoid refetch
      if (newNode.id?.startsWith('mock-node-')) {
        setNodes((nds) => [...nds, {
          id: newNode.id,
          type: "default",
          position: { x: newNode.x || 0, y: newNode.y || 0 },
          data: {
            label: newNode.title,
            detail: newNode.detail,
            updatedAt: newNode.updatedAt,
            graphId: graphId,
          },
        }])
        return newNode
      }
      
      return newNode
    },
    onSuccess: () => {
      // Only invalidate for real graphs, not mock graphs
      if (!graphId.startsWith('mock-')) {
        queryClient.invalidateQueries({ queryKey: ["graph", graphId] })
      }
      toast.success("Node created")
    },
    onError: () => {
      toast.error("Failed to create node")
    },
  })

  // Edge creation mutation
  const createEdgeMutation = useMutation({
    mutationFn: async (data: { sourceNodeId: string; targetNodeId: string; sourceHandle?: string; targetHandle?: string }) => {
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
      const newEdge = await response.json()
      
      // For mock graphs, add edge to local state
      if (graphId.startsWith('mock-')) {
        setEdges((eds) => [...eds, {
          id: newEdge.id,
          source: newEdge.sourceNodeId,
          sourceHandle: data.sourceHandle,
          target: newEdge.targetNodeId,
          targetHandle: data.targetHandle,
          type: "default",
          data: {
            detail: newEdge.detail,
            updatedAt: newEdge.updatedAt,
            graphId: graphId,
          },
        }])
      }
      
      return newEdge
    },
    onSuccess: () => {
      // Only invalidate for real graphs, not mock graphs
      if (!graphId.startsWith('mock-')) {
        queryClient.invalidateQueries({ queryKey: ["graph", graphId] })
      }
      toast.success("Connection created")
      setIsConnecting(false)
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

    // If in connection mode, handle connection logic
    if (isConnecting) {
      if (!selectedNode) {
        // First node selected - just select it
        setSelectedNode(node.id)
        setSelectedNodeData(node.data)
      } else if (selectedNode !== node.id) {
        // Second click on different node - create edge
        createEdgeMutation.mutate({
          sourceNodeId: selectedNode,
          targetNodeId: node.id,
        })
        setSelectedNode(null)
      }
    } else {
      // Normal mode - just select the node
      setSelectedNode(node.id)
      setSelectedNodeData(node.data)
    }
  }, [selectedNode, createEdgeMutation, isEditingEnabled, isConnecting])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    setIsConnecting(false)
  }, [])

  // Custom connection handler to enforce directional handles
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return
    if (!isEditingEnabled) return

    const sourceNode = nodes.find(n => n.id === connection.source)
    const targetNode = nodes.find(n => n.id === connection.target)
    
    if (!sourceNode || !targetNode) return

    // Determine which direction the target is relative to source
    const targetY = targetNode.position.y
    const sourceY = sourceNode.position.y
    
    // If target is BELOW source (targetY > sourceY): use bottom handle for source, top handle for target
    // If target is ABOVE source (targetY < sourceY): use top handle for source, bottom handle for target
    const isTargetBelow = targetY > sourceY
    
    const sourceHandle = isTargetBelow ? 'bottom' : 'top'
    const targetHandle = isTargetBelow ? 'top' : 'bottom'

    createEdgeMutation.mutate({
      sourceNodeId: connection.source,
      targetNodeId: connection.target,
      sourceHandle,
      targetHandle,
    })
    
    setSelectedNode(null)
    setIsConnecting(false)
  }, [nodes, isEditingEnabled, createEdgeMutation, setIsConnecting])

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
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to delete node" }))
        throw new Error(error.error || "Failed to delete node")
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success("Node deleted")
      setSelectedNode(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete node")
      console.error("Delete error:", error)
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
      // Handle mock nodes locally
      if (selectedNode.startsWith('mock-node-') && graphId.startsWith('mock-')) {
        setNodes((nds) => nds.filter((n) => n.id !== selectedNode))
        setEdges((eds) => eds.filter((e) => e.source !== selectedNode && e.target !== selectedNode))
        setSelectedNode(null)
        toast.success("Node deleted")
      } else {
        deleteNodeMutation.mutate(selectedNode)
      }
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
      <div className={`absolute z-10 bg-gray-800 rounded-lg shadow-lg border border-gray-700 ${
        isMobile ? 'top-20 left-4 right-4 p-3' : 'top-4 left-4 p-3'
      }`}>
        <h2 className="text-base font-semibold mb-3 text-white">{graphData.graph.title}</h2>
        
        <div className="space-y-2">
          <Button 
            onClick={addTestNode}
            disabled={createNodeMutation.isPending || !isEditingEnabled}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {createNodeMutation.isPending ? "Creating..." : "Add Node"}
          </Button>
          
          <Button 
            onClick={() => setIsConnecting(!isConnecting)}
            disabled={!isEditingEnabled}
            variant={isConnecting ? "default" : "outline"}
            className={`w-full ${isConnecting ? 'bg-green-600 hover:bg-green-700 text-white border-0' : 'bg-transparent border-gray-600 hover:bg-gray-700 text-gray-300'}`}
            size="sm"
          >
            {isConnecting ? (
              <>
                <Link2Off className="h-4 w-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Connect
              </>
            )}
          </Button>
          
          {selectedNode && isEditingEnabled && (
            <Button 
              onClick={handleDeleteNode}
              disabled={deleteNodeMutation.isPending}
              variant="destructive"
              className="w-full bg-red-600 hover:bg-red-700 text-white border-0"
              size="sm"
            >
              <X className="h-4 w-4 mr-2" />
              Delete (Del)
            </Button>
          )}
        </div>
        
        {isConnecting && (
          <div className="mt-3 text-xs text-center text-blue-400 bg-blue-900/30 py-2 rounded">
            Connection Mode Active
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
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ 
          padding: 0.5,
          maxZoom: 0.7,
          minZoom: 0.3
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
        minZoom={0.3}
        maxZoom={2}
        attributionPosition="bottom-left"
        nodesDraggable={isEditingEnabled}
        nodesConnectable={isEditingEnabled}
        elementsSelectable={isEditingEnabled}
        defaultEdgeOptions={{
          type: 'straight',
          animated: false,
          style: { strokeWidth: 2, stroke: '#9ca3af' },
        }}
      >
        <Background color="#404040" gap={20} size={1} />
      </ReactFlow>


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