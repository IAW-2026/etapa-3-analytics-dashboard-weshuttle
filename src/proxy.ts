import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes that do not require authentication
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/unauthorized'
]);

interface ClerkSessionClaims {
  metadata?: {
    role?: string;
  };
  publicMetadata?: {
    role?: string;
  };
}

export const proxy = clerkMiddleware(async (auth, req) => {
  // If the route is not public, require authentication
  if (!isPublicRoute(req)) {
    const authObj = await auth();
    
    // Redirect to sign-in if not authenticated
    if (!authObj.userId) {
      return authObj.redirectToSignIn({ returnBackUrl: req.url });
    }
    
    // Check if the user has the 'admin' role in session claims first
    const claims = authObj.sessionClaims as unknown as ClerkSessionClaims;
    let role = claims?.metadata?.role || claims?.publicMetadata?.role;
                 
    if (!role && authObj.userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(authObj.userId);
        const userRole = user.publicMetadata?.role;
        role = typeof userRole === 'string' ? userRole : undefined;
      } catch (err) {
        console.error('Error retrieving user role from Clerk:', err);
      }
    }
    
    // If the user does not have the 'admin' role, redirect to unauthorized page
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }
});

export const config = {
  matcher: [
    // Protect all routes except Next.js internals, static files, and metadata icons
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run middleware/proxy for API and TRPC routes
    '/(api|trpc)(.*)',
  ],
};
