"use client"

import { useCallback, useState, useMemo } from "react"
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from "reactflow"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { debounce } from "lodash"

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
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [detail, setDetail] = useState(data?.detail || "")

  const [edgePath, labelX, labelY] = getBezierPath({
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
    onError: (error) => {
      if (error.message === "CONCURRENT_MODIFICATION") {
        toast.error("Other changes detected. Please reload and try again.")
      } else {
        toast.error("Failed to update edge")
      }
    },
  })

  // Debounced update for detail
  const debouncedUpdateDetail = useMemo(
    () => debounce((newDetail: string) => {
      updateEdgeMutation.mutate({ detail: newDetail })
    }, 500),
    [updateEdgeMutation]
  )

  const handleDetailChange = useCallback((newDetail: string) => {
    setDetail(newDetail)
    debouncedUpdateDetail(newDetail)
  }, [debouncedUpdateDetail])

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path stroke-2 stroke-gray-400 hover:stroke-blue-500 cursor-pointer"
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
          className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm cursor-pointer hover:border-blue-500"
          onClick={() => setIsSheetOpen(true)}
        >
          {data?.detail ? "📝" : "✏️"}
        </div>
      </EdgeLabelRenderer>
      
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Edit Connection</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4 mt-6">
            <div>
              <label className="text-sm font-medium">Detail</label>
              <Textarea
                value={detail}
                onChange={(e) => handleDetailChange(e.target.value)}
                placeholder="Add details about this connection..."
                className="min-h-[200px]"
              />
            </div>
            
            <Button onClick={() => setIsSheetOpen(false)} className="w-full">
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
