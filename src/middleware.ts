import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(_req) {
    // Add any custom middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ["/app/:path*"]
}
