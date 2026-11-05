// File: middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const token = request.cookies.get("firebase-auth-token")?.value
  const devBypass = request.cookies.get("dev-bypass")?.value
  const { pathname } = request.nextUrl

  const isLoginPage = pathname.startsWith("/login")
  const isCalculatorPage = pathname === "/calculator" || pathname === "/calculator/"
  const isAuthenticated = Boolean(token || devBypass)

  // Redirect unauthenticated users back to /login
  if (!isAuthenticated && !isLoginPage && !isCalculatorPage) {
    return NextResponse.redirect(new URL("/login", request.url))
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