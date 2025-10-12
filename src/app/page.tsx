import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import Link from "next/link"

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  
  if (session) {
    redirect("/app")
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mindmap App
          </h1>
          <p className="text-gray-600 mb-6">
            Create and share interactive mindmaps
          </p>
          <Link
            href="/api/auth/signin/google"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 inline-block text-center"
          >
            Sign in with Google
          </Link>
        </div>
      </div>
    </div>
  )
}