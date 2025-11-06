import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Create a response object
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Get the pathname of the request
  const pathname = request.nextUrl.pathname;

  // Check if the path is the login page
  const isLoginPage = pathname === '/login';

  // Check if this is an API route or static file
  const isApiRoute = pathname.startsWith('/api/');
  const isStaticFile = pathname.includes('.');

  // Skip middleware for API routes and static files
  if (isApiRoute || isStaticFile) {
    return response;
  }

  try {
    // Create Supabase client with proper cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // Set cookie in the request
            request.cookies.set({
              name,
              value,
              ...options,
            });
            // Set cookie in the response
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            // Remove cookie from the request
            request.cookies.set({
              name,
              value: '',
              ...options,
            });
            // Remove cookie from the response
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Get the session from cookies
    const { data: { session }, error } = await supabase.auth.getSession();

    // Debug logging
    console.log('[Middleware] Path:', pathname);
    console.log('[Middleware] Session exists:', !!session);
    console.log('[Middleware] User email:', session?.user?.email || 'Not authenticated');

    // If there's no session and trying to access protected routes
    if (!session && !isLoginPage) {
      console.log('[Middleware] No session, redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // If there's a session and trying to access login page
    if (session && isLoginPage) {
      console.log('[Middleware] Session exists, redirecting to home');
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Return the response with updated cookies
    return response;

  } catch (error) {
    console.error('[Middleware] Error:', error);
    // If there's an error, redirect to login for safety (unless already on login page)
    if (!isLoginPage) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};