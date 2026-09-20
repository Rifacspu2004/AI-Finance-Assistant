// File: middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const token = request.cookies.get("firebase-auth-token")?.value
  const devBypass = request.cookies.get("dev-bypass")?.value
  const { pathname } = request.nextUrl

  const isLoginPage = pathname.startsWith("/login")
  const isAuthenticated = Boolean(token || devBypass)

  // Redirect unauthenticated users back to /login
  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Prevent authenticated/bypassed users from seeing /login again
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}