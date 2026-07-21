import type { Handle, HandleServerError } from '@sveltejs/kit';
import type { Session, User } from '@supabase/supabase-js';
import { logger } from '$lib/server/logger';
import { createSupabaseServerClient } from '$lib/server/supabase';

function isApiV1(pathname: string) {
  return pathname.startsWith('/api/v1/');
}

export const handle: Handle = async ({ event, resolve }) => {
  // Handle CORS preflight for mobile API
  if (isApiV1(event.url.pathname) && event.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // Canonical @supabase/ssr "one client per request" pattern: create the
  // request-scoped server client ONCE (with the cookie get/set handlers that
  // let a token refresh write the rotated cookies back), stash it on
  // event.locals.supabase, and expose a memoized safeGetSession() that validates
  // the JWT with getUser() exactly once per request. Cookie-based SSR loads and
  // actions read these off locals instead of each creating their own client and
  // racing on token refresh.
  event.locals.supabase = createSupabaseServerClient(event.cookies);

  let sessionPromise: Promise<{ session: Session | null; user: User | null }> | null = null;
  event.locals.safeGetSession = () => {
    if (!sessionPromise) {
      sessionPromise = (async () => {
        // getUser() revalidates the JWT against the auth server (unlike the
        // local-only getSession()); only trust the session once the user is
        // validated. On any auth error we fail closed (treated as logged out).
        const {
          data: { user },
          error
        } = await event.locals.supabase.auth.getUser();
        if (error || !user) {
          return { session: null, user: null };
        }

        // Session is only read after validation, so its contents are trustworthy.
        const {
          data: { session }
        } = await event.locals.supabase.auth.getSession();
        return { session, user };
      })();
    }
    return sessionPromise;
  };

  const response = await resolve(event);

  // CORS headers for /api/v1/ responses
  if (isApiV1(event.url.pathname)) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  }

  // Security headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
};

/**
 * Central error hook: every uncaught server exception (load, action, endpoint)
 * flows through here. We log it with request context (routed to the monitoring
 * seam in logger.ts when a DSN is configured) and return a SAFE message —
 * never the internal error string, to avoid leaking stack/implementation detail.
 */
export const handleError: HandleServerError = ({ error, event, status, message }) => {
  const errorId = crypto.randomUUID();

  const context = {
    errorId,
    status,
    routeId: event.route.id,
    method: event.request.method,
    path: event.url.pathname
  };

  // Only genuine 5xx failures are error-level (and forwarded to monitoring).
  // Client errors like 404s are expected noise — log them at info, never as
  // "unhandled server error".
  if (status && status < 500) {
    logger.info('client error', { ...context, message });
  } else {
    logger.error('unhandled server error', { ...context, error });
  }

  return {
    message: status && status < 500 ? message : 'Something went wrong. Please try again.',
    errorId
  };
};
