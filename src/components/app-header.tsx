"use client"

// import { signOut } from "next-auth/react" // Temporarily disabled
import { Button } from "@/components/ui/button"
import { Plus, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

interface AppHeaderProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function AppHeader({ user }: AppHeaderProps) {
  const router = useRouter()
  
  const handleCreateGraph = async () => {
    try {
      const response = await fetch("/api/graph", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "New Mindmap",
        }),
      })
      
      if (response.ok) {
        const graph = await response.json()
        router.push(`/app/${graph.id}`)
      }
    } catch (error) {
      console.error("Failed to create graph:", error)
    }
  }
  
  return (
    <header className="fixed top-0 left-0 right-0 bg-gray-800 border-b border-gray-700 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-white">
              Mindmap App
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button onClick={handleCreateGraph} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Mindmap
            </Button>
            
            <div className="flex items-center space-x-3">
              {user.image && (
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <span className="text-sm text-gray-300">
                {user.name || user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Temporarily disabled - will add back with auth
                  alert("Logout will be available when authentication is added")
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
