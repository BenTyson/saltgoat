import type { Handle, HandleServerError } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';

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

  logger.error('unhandled server error', {
    errorId,
    error,
    status,
    routeId: event.route.id,
    method: event.request.method,
    path: event.url.pathname
  });

  return {
    message: status && status < 500 ? message : 'Something went wrong. Please try again.',
    errorId
  };
};
