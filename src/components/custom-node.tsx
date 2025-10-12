"use client"

import { useCallback, useState, useMemo } from "react"
import { Handle, Position, NodeProps } from "reactflow"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { debounce } from "lodash"

export function CustomNode({ data, id }: NodeProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [title, setTitle] = useState(data.label || "")
  const [detail, setDetail] = useState(data.detail || "")

  const updateNodeMutation = useMutation({
    mutationFn: async (updateData: { title?: string; detail?: string }) => {
      const response = await fetch(`/api/nodes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updateData,
          updatedAt: data.updatedAt,
        }),
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

  // Debounced update for detail
  const debouncedUpdateDetail = useMemo(
    () => debounce((newDetail: string) => {
      updateNodeMutation.mutate({ detail: newDetail })
    }, 500),
    [updateNodeMutation]
  )

  const handleDetailChange = useCallback((newDetail: string) => {
    setDetail(newDetail)
    debouncedUpdateDetail(newDetail)
  }, [debouncedUpdateDetail])

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle)
  }, [])

  const handleSaveTitle = useCallback(() => {
    if (title !== data.label) {
      updateNodeMutation.mutate({ title })
    }
    setIsSheetOpen(false)
  }, [title, data.label, updateNodeMutation])

  return (
    <>
      <div 
        className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-400 cursor-pointer hover:border-blue-500"
        onClick={() => setIsSheetOpen(true)}
      >
        <Handle type="target" position={Position.Top} className="w-3 h-3" />
        <div className="font-bold">{title}</div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      </div>
      
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Edit Node</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4 mt-6">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Node title"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Detail</label>
              <Textarea
                value={detail}
                onChange={(e) => handleDetailChange(e.target.value)}
                placeholder="Add details..."
                className="min-h-[200px]"
              />
            </div>
            
            <Button onClick={handleSaveTitle} className="w-full">
              Save Changes
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
