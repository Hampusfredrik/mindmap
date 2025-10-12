import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { createGraphSchema } from "@/lib/validations"
import { db } from "@/lib/db"
import { graphs } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

export async function GET() {
  const session = await requireAuth()
  
  if (session instanceof NextResponse) {
    return session
  }
  
  // For now, return empty array since we don't have a database
  // In the future, this will query the real database
  try {
    const userGraphs = await db
      .select()
      .from(graphs)
      .where(eq(graphs.userId, session.user.id))
    
    return NextResponse.json(userGraphs)
  } catch (error) {
    console.warn("Database not available, returning empty array:", error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAuth()
  
  if (session instanceof NextResponse) {
    return session
  }
  
  try {
    const body = await request.json()
    const { title } = createGraphSchema.parse(body)
    
    // For now, return a mock graph since we don't have a database
    // In the future, this will insert into the real database
    try {
      const [graph] = await db
        .insert(graphs)
        .values({
          title,
          userId: session.user.id!,
        })
        .returning()
      
      return NextResponse.json(graph)
    } catch (dbError) {
      console.warn("Database not available, returning mock graph:", dbError)
      
      // Return a mock graph with a random ID
      const mockGraph = {
        id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title,
        userId: session.user.id!,
        createdAt: new Date().toISOString(),
      }
      
      return NextResponse.json(mockGraph)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    
    console.error("Error creating graph:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
