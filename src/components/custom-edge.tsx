"use client"

import { useCallback, useState, useMemo, useEffect } from "react"
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer } from "reactflow"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import debounce from "lodash/debounce"

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const queryClient = useQueryClient()
  const graphId = data?.graphId
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [detail, setDetail] = useState(data?.detail || "")

  // Sync local state with props when they change
  useEffect(() => {
    setDetail(data?.detail || "")
  }, [data?.detail])

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const updateEdgeMutation = useMutation({
    mutationFn: async (updateData: { detail: string }) => {
      const response = await fetch(`/api/edges/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updateData,
          updatedAt: data?.updatedAt,
        }),
      })
      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("CONCURRENT_MODIFICATION")
        }
        throw new Error("Failed to update edge")
      }
      return response.json()
    },
    onSuccess: () => {
      if (graphId) {
        queryClient.invalidateQueries({ queryKey: ["graph", graphId] })
      }
      toast.success("Connection details saved")
      setIsSheetOpen(false)
    },
    onError: (error: Error) => {
      if (error.message === "CONCURRENT_MODIFICATION") {
        toast.error("Other changes detected. Please reload and try again.")
      } else {
        toast.error("Failed to update edge")
      }
    },
  })

  // Save detail manually
  const handleSave = useCallback(() => {
    if (detail !== data?.detail) {
      updateEdgeMutation.mutate({ detail })
    } else {
      setIsSheetOpen(false)
    }
  }, [detail, data?.detail, updateEdgeMutation])

  return (
    <>
      <defs>
        <marker
          id={`arrow-${id}`}
          markerWidth="12"
          markerHeight="12"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="#9ca3af" className="hover:fill-blue-400" />
        </marker>
      </defs>
      <path
        id={id}
        className="react-flow__edge-path stroke-2 hover:stroke-blue-400 cursor-pointer"
        style={{ stroke: '#9ca3af', markerEnd: `url(#arrow-${id})` }}
        d={edgePath}
        onClick={() => setIsSheetOpen(true)}
      />
      
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="px-2 py-1 bg-gray-800 border border-gray-600 rounded shadow-sm cursor-pointer hover:border-blue-500"
          onClick={() => setIsSheetOpen(true)}
        >
          <span className="text-white">{data?.detail ? "📝" : "✏️"}</span>
        </div>
      </EdgeLabelRenderer>
      
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]" aria-describedby="edit-connection-description">
          <SheetHeader>
            <SheetTitle>Edit Connection</SheetTitle>
            <p className="text-sm text-gray-500" id="edit-connection-description">
              Add details about this connection
            </p>
          </SheetHeader>
          
          <div className="space-y-4 mt-6">
            <div>
              <label className="text-sm font-medium">Detail</label>
              <Textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Add details about this connection..."
                className="min-h-[200px]"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleSave}
                disabled={updateEdgeMutation.isPending}
                className="flex-1"
              >
                {updateEdgeMutation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setIsSheetOpen(false)}
                disabled={updateEdgeMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
