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
  
  const userGraphs = await db
    .select()
    .from(graphs)
    .where(eq(graphs.userId, session.user.id))
  
  return NextResponse.json(userGraphs)
}

export async function POST(request: NextRequest) {
  const session = await requireAuth()
  
  if (session instanceof NextResponse) {
    return session
  }
  
  try {
    const body = await request.json()
    const { title } = createGraphSchema.parse(body)
    
    const [graph] = await db
      .insert(graphs)
      .values({
        title,
        userId: session.user.id!,
      })
      .returning()
    
    return NextResponse.json(graph)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
