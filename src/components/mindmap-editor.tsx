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
  getBezierPath,
} from "reactflow"
import "reactflow/dist/style.css"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

// Modern custom node component with selection state and editing
function CustomNode({ data, id, selected, onUpdateTitle }: { data: any; id: string; selected?: boolean; onUpdateTitle?: (id: string, newTitle: string, updatedAt: string) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(data.label)

  // Sync local state when data.label changes from external updates
  useEffect(() => {
    setEditTitle(data.label)
  }, [data.label])

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }

  const handleTitleSubmit = () => {
    if (onUpdateTitle && editTitle !== data.label) {
      onUpdateTitle(id, editTitle, data.updatedAt)
    }
    setIsEditing(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit()
    } else if (e.key === 'Escape') {
      setEditTitle(data.label)
      setIsEditing(false)
    }
  }

  return (
    <div className={`px-6 py-4 shadow-lg rounded-2xl bg-white border-2 cursor-pointer transition-all duration-200 hover:shadow-xl ${
      selected 
        ? 'border-blue-500 bg-blue-50 shadow-blue-200' 
        : 'border-gray-200 hover:border-blue-300'
    }`}>
      {isEditing ? (
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleTitleSubmit}
          onKeyDown={handleKeyPress}
          className="w-full bg-transparent border-none outline-none font-bold text-gray-900 text-center"
          autoFocus
        />
      ) : (
        <div 
          className="font-bold text-gray-900 hover:text-blue-600 transition-colors"
          onClick={handleTitleClick}
        >
          {data.label}
        </div>
      )}
      {data.detail && (
        <div className="text-xs text-gray-500 mt-2 text-center">{data.detail}</div>
      )}
    </div>
  )
}

// Custom edge component with arrows
function CustomEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, data, selected }: any) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <path
      id={id}
      style={style}
      className="react-flow__edge-path stroke-2"
      d={edgePath}
      markerEnd="url(#arrowclosed)"
    />
  )
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

  // React Flow event handlers
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (!isEditingEnabled) {
      // In read-only mode, open detail sheet
      setSelectedNodeData(node.data)
      setDetailSheetOpen(true)
      return
    }

    if (selectedNode === node.id) {
      // Second click on same node - open detail sheet
      setSelectedNodeData(node.data)
      setDetailSheetOpen(true)
    } else if (selectedNode) {
      // Second click on different node - create edge
      createEdgeMutation.mutate({
        sourceNodeId: selectedNode,
        targetNodeId: node.id,
      })
    } else {
      // First click - select node
      setSelectedNode(node.id)
    }
  }, [selectedNode, createEdgeMutation, isEditingEnabled])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  // Node title update mutation
  const updateNodeTitleMutation = useMutation({
    mutationFn: async (data: { id: string; title: string; updatedAt: string }) => {
      const response = await fetch(`/api/nodes/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to update node title")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graph", graphId] })
      toast.success("Node title updated")
    },
    onError: () => {
      toast.error("Failed to update node title")
    },
  })

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
      if (!response.ok) throw new Error("Failed to update node position")
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

  // Define node types with update callback
  const nodeTypes: NodeTypes = useMemo(() => ({
    default: (props: any) => (
      <CustomNode 
        {...props} 
        onUpdateTitle={(id, newTitle, updatedAt) => {
          updateNodeTitleMutation.mutate({ id, title: newTitle, updatedAt })
        }}
      />
    ),
  }), [updateNodeTitleMutation])

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
      {/* Mobile editing toggle */}
      {isMobile && (
        <div className="absolute top-4 left-4 right-4 z-20 bg-white rounded-lg shadow-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
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
      <div className={`absolute z-10 bg-white rounded-lg shadow-lg p-4 ${
        isMobile ? 'top-20 left-4 right-4' : 'top-4 left-4'
      }`}>
        <h2 className="text-lg font-bold mb-2">Mindmap Editor</h2>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Title: {graphData.graph.title}</p>
          <p>Nodes: {nodes.length}</p>
          <p>Edges: {edges.length}</p>
          {performanceMode && <p className="text-orange-600 font-medium">Performance Mode</p>}
        </div>
        <Button 
          onClick={addTestNode}
          disabled={createNodeMutation.isPending || !isEditingEnabled}
          className="mt-3 w-full"
          size="sm"
        >
          {createNodeMutation.isPending ? "Creating..." : "Add Node"}
        </Button>
        
        {/* Connection instructions */}
        {isEditingEnabled && (
          <div className="mt-3 text-xs text-gray-600">
            <p><strong>To connect:</strong> Click first node, then second node</p>
            <p><strong>To edit:</strong> Click selected node again</p>
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
          style: performanceMode ? { strokeWidth: 1 } : { strokeWidth: 2 },
        }}
      >
        <defs>
          <marker id="arrowclosed" type="closed" markerWidth="10" markerHeight="10" refX="9" refY="5">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
          </marker>
        </defs>
        <Background />
        <Controls />
        {!performanceMode && <MiniMap />}
      </ReactFlow>

      {/* Instructions */}
      <div className={`absolute z-10 bg-blue-50 border border-blue-200 rounded-lg p-3 ${
        isMobile ? 'bottom-4 left-4 right-4' : 'bottom-4 left-4 max-w-sm'
      }`}>
        <p className="text-blue-800 text-sm">
          <strong>Interactive Mindmap</strong><br/>
          {isEditingEnabled ? (
            <>
              • Click to select nodes<br/>
              • Click two nodes to connect<br/>
              • Click selected node to edit details<br/>
              • Drag to move nodes
            </>
          ) : (
            <>
              • Click nodes to view details<br/>
              • Use controls to zoom/pan<br/>
              • Enable editing to modify
            </>
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