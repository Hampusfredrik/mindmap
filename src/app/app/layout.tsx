import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AppHeader } from "@/components/app-header"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/")
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
