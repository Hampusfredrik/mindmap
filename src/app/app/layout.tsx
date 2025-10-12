import { AppHeader } from "@/components/app-header"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Mock user for development
  const session = {
    user: {
      id: "dev-user-123",
      name: "Development User",
      email: "dev@example.com",
      image: null
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={session.user} />
      <main className="pt-16">
        {children}
      </main>
    </div>
  )
}
