import { WeChatApi } from './api.js';
import { MessageItemType, MessageType, MessageState, TypingStatus, type MessageItem, type OutboundMessage } from './types.js';
import { logger } from '../logger.js';

const TYPING_KEEPALIVE_MS = 5_000;

export function createSender(api: WeChatApi, botAccountId: string) {
  let clientCounter = 0;
  const typingTicketCache = new Map<string, { ticket: string; fetchedAt: number }>();
  const TICKET_TTL = 24 * 60 * 60 * 1000;

  function generateClientId(): string {
    return `wcc-${Date.now()}-${++clientCounter}`;
  }

  async function getTypingTicket(userId: string, contextToken?: string): Promise<string> {
    const cached = typingTicketCache.get(userId);
    if (cached && Date.now() - cached.fetchedAt < TICKET_TTL) {
      return cached.ticket;
    }
    try {
      const resp = await api.getConfig(userId, contextToken);
      if (resp.ret === 0 && resp.typing_ticket) {
        typingTicketCache.set(userId, { ticket: resp.typing_ticket, fetchedAt: Date.now() });
        return resp.typing_ticket;
      }
      logger.warn('getConfig returned no typing_ticket', { ret: resp.ret });
    } catch (err) {
      logger.warn('getConfig failed', { err: err instanceof Error ? err.message : String(err) });
    }
    return '';
  }

  /**
   * Start typing indicator with keepalive. Returns a stop function.
   * Fire-and-forget: errors are logged but not thrown.
   */
  function startTyping(toUserId: string, contextToken: string): () => void {
    let cancelled = false;

    (async () => {
      const ticket = await getTypingTicket(toUserId, contextToken);
      if (!ticket || cancelled) return;

      try {
        await api.sendTyping({
          ilink_user_id: toUserId,
          typing_ticket: ticket,
          status: TypingStatus.TYPING,
        });
      } catch (err) {
        logger.debug('sendTyping start failed', { err: err instanceof Error ? err.message : String(err) });
        return;
      }

      // Keepalive loop
      while (!cancelled) {
        await new Promise(r => setTimeout(r, TYPING_KEEPALIVE_MS));
        if (cancelled) break;
        try {
          await api.sendTyping({
            ilink_user_id: toUserId,
            typing_ticket: ticket,
            status: TypingStatus.TYPING,
          });
        } catch {
          break;
        }
      }

      // Send CANCEL to tell WeChat we're done typing
      if (!ticket) return;
      try {
        await api.sendTyping({
          ilink_user_id: toUserId,
          typing_ticket: ticket,
          status: TypingStatus.CANCEL,
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }

  async function sendText(toUserId: string, contextToken: string, text: string): Promise<void> {
    const clientId = generateClientId();

    const items: MessageItem[] = [
      {
        type: MessageItemType.TEXT,
        text_item: { text },
      },
    ];

    const msg: OutboundMessage = {
      from_user_id: botAccountId,
      to_user_id: toUserId,
      client_id: clientId,
      message_type: MessageType.BOT,
      message_state: MessageState.FINISH,
      context_token: contextToken,
      item_list: items,
    };

    logger.info('Sending text message', { toUserId, clientId, textLength: text.length });
    await api.sendMessage({ msg });
    logger.info('Text message sent', { toUserId, clientId });
  }

  return { sendText, startTyping };
}
