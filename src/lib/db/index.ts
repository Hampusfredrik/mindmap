import { drizzle } from "drizzle-orm/vercel-postgres"
import { sql } from "@vercel/postgres"
import * as schema from "./schema"

// For development without database, we'll create a mock
let db: any

try {
  if (process.env.DATABASE_URL) {
    db = drizzle(sql, { schema })
  } else {
    // Mock database for development
    db = {
      select: () => ({ from: () => ({ where: () => [] }) }),
      insert: () => ({ values: () => ({ returning: () => [] }) }),
      update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) }),
      delete: () => ({ where: () => [] })
    }
  }
} catch (error) {
  console.warn("Database connection failed, using mock database:", error)
  // Mock database for development
  db = {
    select: () => ({ from: () => ({ where: () => [] }) }),
    insert: () => ({ values: () => ({ returning: () => [] }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) }),
    delete: () => ({ where: () => [] })
  }
}

export { db }
