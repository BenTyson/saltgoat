// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

declare global {
  namespace App {
    interface Error {
      message: string;
      errorId?: string;
    }
    interface Locals {
      /** Request-scoped Supabase server client (created once in hooks.server.ts). */
      supabase: SupabaseClient<Database>;
      /**
       * Validates the JWT with getUser() exactly once per request (memoized) and
       * returns the validated user plus the real session. Both are null when no
       * valid session exists or the auth server errors (fail closed).
       */
      safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
