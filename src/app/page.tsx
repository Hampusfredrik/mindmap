import { redirect } from "next/navigation"
import Link from "next/link"

export default async function HomePage() {
  // For now, always redirect to app since we're using mock auth
  redirect("/app")
  
  // This code will be used when we add real authentication
  /*
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
            href="/app"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 inline-block text-center"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  )
  */
}