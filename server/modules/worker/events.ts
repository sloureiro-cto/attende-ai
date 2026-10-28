import 'server-only';
import type { Channel, JsynqConversation } from '../../lib/jsynq';

/** A conversation in a workspace. */
export type ConversationRef = { workspaceId: string; channel: Channel; sessionId: string; conversationId: string };

/**
 * The one internal stream the worker feeds from the websocket and the safety poll. Every message event is emitted
 * once per JSYNQ message id (`worker_seen_messages`), whichever path saw it first.
 */
export type WorkerEvent =
  | (ConversationRef & {
      type: 'inbound_message';
      messageId: string;
      /** Full text, read from the messages endpoint (the websocket only carries a preview). `""` for media. */
      text: string;
      createdAt: Date;
      /** No earlier contact message in this conversation. */
      firstInbound: boolean;
    })
  | (ConversationRef & {
      type: 'message_sent';
      messageId: string;
      createdAt: Date;
      /**
       * `ai`: an AI agent's reply (`senderType: 'agent'` with an `agentExecutionId`, not a template rule);
       * `automation`: a JSYNQ template/automation message; `self`: sent by this worker's gateway; `human`: a member.
       */
      by: 'ai' | 'automation' | 'self' | 'human';
      failed: boolean;
    })
  | (ConversationRef & {
      type: 'conversation_state';
      state: string | null;
      assignedUserId: string | null;
      conversation: JsynqConversation;
    });

export const CHANNELS: readonly Channel[] = ['whatsapp', 'sms', 'instagram'];
export const isChannel = (v: unknown): v is Channel => typeof v === 'string' && (CHANNELS as readonly string[]).includes(v);
