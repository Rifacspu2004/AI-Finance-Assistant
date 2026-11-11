// File: middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { SESSION_ACTIVITY_COOKIE } from "@/lib/auth-session"

export function middleware(request: NextRequest) {
  const token = request.cookies.get("firebase-auth-token")?.value
  const sessionActivity = request.cookies.get(SESSION_ACTIVITY_COOKIE)?.value
  const devBypass = request.cookies.get("dev-bypass")?.value
  const { pathname } = request.nextUrl

  const isLoginPage = pathname.startsWith("/login")
  const isCalculatorPage = pathname === "/calculator" || pathname === "/calculator/"
  const isAuthenticated = Boolean((token && sessionActivity) || devBypass)

  // Redirect unauthenticated users back to /login
  if (!isAuthenticated && !isLoginPage && !isCalculatorPage) {
    const response = NextResponse.redirect(new URL("/login", request.url))
    response.cookies.delete("firebase-auth-token")
    response.cookies.delete(SESSION_ACTIVITY_COOKIE)
    return response
  }

  // Prevent authenticated/bypassed users from seeing /login again
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - api routes (/api/...)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - All public static assets (images, icons, fonts, etc.)
     */
    "/((?!api|_next/static|_next/image|_next/webpack-hmr|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp|.*\\.svg|.*\\.ico|.*\\.woff|.*\\.woff2|.*\\.ttf|.*\\.eot).*)",
  ],
}