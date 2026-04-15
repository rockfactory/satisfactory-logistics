import type { RealtimeChannel } from '@supabase/supabase-js';
import { loglev } from '@/core/logger/log';

const logger = loglev.getLogger('games:realtime-sync');

/**
 * Wraps `channel.send` to log non-ok responses and rejections. The Supabase
 * client returns a Promise<'ok' | 'timed out' | 'error'> that we otherwise
 * ignore — failures (e.g. RLS denies, channel closed, payload too big) would
 * be silent and very hard to diagnose at runtime.
 */
export interface SafeChannelSendArgs {
  channel: RealtimeChannel;
  message: Parameters<RealtimeChannel['send']>[0];
  context: string;
}

export function safeChannelSend({
  channel,
  message,
  context,
}: SafeChannelSendArgs): void {
  channel
    .send(message)
    .then(status => {
      if (status !== 'ok') {
        logger.warn(`channel.send (${context}) returned: ${status}`);
      }
    })
    .catch(err => {
      logger.error(`channel.send (${context}) failed`, err);
    });
}
