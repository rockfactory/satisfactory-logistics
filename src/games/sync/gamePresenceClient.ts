import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  supabaseClient,
} from '@/core/supabase';
import { PRESENCE_TTL_SECONDS } from './realtimeSyncTypes';

// HTTP helpers for the `game_presence` table. upsertPresence / fetchPresence
// go through the Supabase SDK so RLS, auth, and typing are handled by the
// client. deletePresenceOnUnload stays on raw fetch because it must use
// `keepalive: true` to survive the unload event, which the SDK does not
// expose.

export interface PresenceRow {
  saved_id: string;
  sender_id: string;
  user_id: string;
  last_seen_at: string;
}

export async function upsertPresence(params: {
  savedId: string;
  senderId: string;
  userId: string;
}): Promise<void> {
  const { savedId, senderId, userId } = params;
  const { error } = await supabaseClient.from('game_presence').upsert(
    {
      saved_id: savedId,
      sender_id: senderId,
      user_id: userId,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'saved_id,sender_id' },
  );
  if (error) {
    throw new Error(`upsertPresence failed: ${error.message}`);
  }
}

export async function fetchPresence(params: {
  savedId: string;
  signal?: AbortSignal;
}): Promise<PresenceRow[]> {
  const { savedId, signal } = params;
  // PostgREST doesn't allow arbitrary SQL in the filter, so we compute the
  // cutoff client-side. Clock skew within a few seconds is acceptable for
  // presence; TTL has a built-in buffer (multiple heartbeat intervals).
  const cutoff = new Date(
    Date.now() - PRESENCE_TTL_SECONDS * 1000,
  ).toISOString();

  let query = supabaseClient
    .from('game_presence')
    .select('saved_id,sender_id,user_id,last_seen_at')
    .eq('saved_id', savedId)
    .gt('last_seen_at', cutoff);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) {
    // The SDK emits an error with name 'AbortError' when the signal aborts;
    // let the caller filter it out like a native fetch abort.
    if (signal?.aborted) {
      const abortErr = new Error(error.message);
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    throw new Error(`fetchPresence failed: ${error.message}`);
  }
  return data ?? [];
}

export function deletePresenceOnUnload(params: {
  savedId: string;
  senderId: string;
  accessToken: string;
}): void {
  const { savedId, senderId, accessToken } = params;
  // keepalive lets the request complete after the page is gone. The SDK does
  // not expose this flag, so we hit PostgREST directly. TTL expiry
  // (PRESENCE_TTL_SECONDS) is the natural fallback if this request is dropped.
  fetch(
    `${SUPABASE_URL}/rest/v1/game_presence` +
      `?saved_id=eq.${encodeURIComponent(savedId)}` +
      `&sender_id=eq.${encodeURIComponent(senderId)}`,
    {
      method: 'DELETE',
      keepalive: true,
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
    },
  ).catch(() => {});
}
