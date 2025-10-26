"use client"

import { useCallback, useState, useMemo, useRef, useEffect } from "react"
import { Handle, Position, NodeProps } from "reactflow"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import debounce from "lodash/debounce"

export function CustomNode({ data, id }: NodeProps) {
  const queryClient = useQueryClient()
  const graphId = data.graphId
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(data.label || "")
  const [detail, setDetail] = useState(data.detail || "")
  const inputRef = useRef<HTMLInputElement>(null)

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
    onSuccess: () => {
      if (graphId) {
        queryClient.invalidateQueries({ queryKey: ["graph", graphId] })
      }
      toast.success("Node updated")
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

  const handleStartEdit = useCallback(() => {
    setIsEditing(true)
  }, [])

  const handleFinishEdit = useCallback(() => {
    setIsEditing(false)
    if (title !== data.label) {
      updateNodeMutation.mutate({ title })
    }
  }, [title, data.label, updateNodeMutation])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleFinishEdit()
    } else if (e.key === 'Escape') {
      setTitle(data.label)
      setIsEditing(false)
    }
  }, [handleFinishEdit, data.label])

  // Auto-focus and select text when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Sync local state with props when they change
  useEffect(() => {
    setTitle(data.label || "")
  }, [data.label])

  useEffect(() => {
    setDetail(data.detail || "")
  }, [data.detail])

  return (
    <>
      <div 
        className="px-6 py-4 shadow-lg rounded-lg bg-blue-600 border-2 border-blue-500 hover:border-blue-400 transition-all duration-200 relative group"
      >
        <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-gray-400" />
        
        {isEditing ? (
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleFinishEdit}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none outline-none font-semibold text-white text-center"
            type="text"
          />
        ) : (
          <div 
            className="font-semibold text-white text-center cursor-pointer"
            onClick={handleStartEdit}
          >
            {title}
          </div>
        )}
        
        {/* Edit details button */}
        <button
          onClick={() => setIsSheetOpen(true)}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center text-white hover:bg-white/20 rounded"
          title="Edit details"
        >
          ⋮
        </button>
        
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-gray-400" />
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
