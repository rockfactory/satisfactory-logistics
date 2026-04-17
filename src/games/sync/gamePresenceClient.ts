import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/core/supabase';
import { PRESENCE_TTL_SECONDS } from './realtimeSyncTypes';

// HTTP helpers for the `game_presence` table. We use the raw PostgREST
// endpoint (same pattern as flushRemoteGameOnUnload) because:
//  - the generated Database type in database.types.ts does not yet include
//    `game_presence` until `npm run supabase:types` is re-run after the
//    migration is applied;
//  - the unload DELETE must use `fetch(..., { keepalive: true })`, which only
//    the raw API supports.
//
// All calls go through PostgREST with the user's session access_token so
// Row Level Security policies apply.

export interface PresenceRow {
  saved_id: string;
  sender_id: string;
  user_id: string;
  last_seen_at: string;
}

function buildHeaders(accessToken: string): Record<string, string> {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

export async function upsertPresence(params: {
  savedId: string;
  senderId: string;
  userId: string;
  accessToken: string;
}): Promise<void> {
  const { savedId, senderId, userId, accessToken } = params;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/game_presence`, {
    method: 'POST',
    headers: {
      ...buildHeaders(accessToken),
      // Upsert on conflict on the (saved_id, sender_id) primary key.
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      saved_id: savedId,
      sender_id: senderId,
      user_id: userId,
      last_seen_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    throw new Error(
      `upsertPresence failed: ${res.status} ${res.statusText} ${await res
        .text()
        .catch(() => '')}`,
    );
  }
}

export async function fetchPresence(params: {
  savedId: string;
  accessToken: string;
  signal?: AbortSignal;
}): Promise<PresenceRow[]> {
  const { savedId, accessToken, signal } = params;
  // PostgREST doesn't allow arbitrary SQL in the filter, so we compute the
  // cutoff client-side. Clock skew within a few seconds is acceptable for
  // presence; TTL has a built-in buffer (2x heartbeat interval).
  const cutoff = new Date(
    Date.now() - PRESENCE_TTL_SECONDS * 1000,
  ).toISOString();
  const url =
    `${SUPABASE_URL}/rest/v1/game_presence` +
    `?select=saved_id,sender_id,user_id,last_seen_at` +
    `&saved_id=eq.${encodeURIComponent(savedId)}` +
    `&last_seen_at=gt.${encodeURIComponent(cutoff)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(accessToken),
    signal,
  });
  if (!res.ok) {
    throw new Error(
      `fetchPresence failed: ${res.status} ${res.statusText} ${await res
        .text()
        .catch(() => '')}`,
    );
  }
  return (await res.json()) as PresenceRow[];
}

export function deletePresenceOnUnload(params: {
  savedId: string;
  senderId: string;
  accessToken: string;
}): void {
  const { savedId, senderId, accessToken } = params;
  // keepalive lets the request complete after the page is gone. TTL expiry
  // (PRESENCE_TTL_SECONDS) is the natural fallback if this request is dropped.
  fetch(
    `${SUPABASE_URL}/rest/v1/game_presence` +
      `?saved_id=eq.${encodeURIComponent(savedId)}` +
      `&sender_id=eq.${encodeURIComponent(senderId)}`,
    {
      method: 'DELETE',
      keepalive: true,
      headers: {
        ...buildHeaders(accessToken),
        Prefer: 'return=minimal',
      },
    },
  ).catch(() => {});
}
