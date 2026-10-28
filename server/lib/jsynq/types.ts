import 'server-only';
/** Shapes of the JSYNQ responses this service reads. Only the fields we use. */

export type Channel = 'whatsapp' | 'instagram' | 'sms';

export type JsynqAgent = {
  id: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  isActive?: boolean;
  knowledgeTrust?: 'trusted' | 'untrusted';
};

export type JsynqBinding = {
  _id: string;
  agentId?: string;
  channel: string;
  sessionId?: string;
  status: 'active' | 'paused' | 'completed';
  policy?: Record<string, unknown>;
};

export type JsynqSession = { _id: string; status?: string; label?: string; deletedAt?: string | null };

export type JsynqWorkspace = {
  _id: string;
  name?: string;
  owner?: { _id: string } | string;
  members?: Array<{ _id: string } | string>;
  businessHours?: unknown;
};

export type JsynqKnowledgeSource = {
  id: string;
  refId?: string;
  status: 'pending' | 'processing' | 'ready' | 'failed' | 'skipped';
  pageCount?: number;
  errorMessage?: string;
};

/** P3 limits document (what we PUT; server-managed fields come back on GET). */
export type JsynqLimitsInput = {
  status: 'active' | 'suspended';
  validUntil: string | null;
  limits: {
    messagingChannels?: number;
    agents?: number;
    aiRepliesPerMonth?: number;
    knowledgeDocuments?: number;
    members?: number;
    outboundMessages?: { max: number; windowEndsAt: string | null } | null;
  };
  rateLimitProfile?: 'strict' | 'standard' | null;
};

export type JsynqLimitsDoc = JsynqLimitsInput & { version: number; updatedAt: string; outboundUsed: number };

export type JsynqUsage = {
  month: string;
  meters: { aiReplies: number; outboundMessages: number };
  live: { messagingChannels: number; agents: number; knowledgeDocuments: number; members: number };
  limits: JsynqLimitsDoc | null;
};

export type JsynqLoginToken = {
  id: string;
  email: string;
  name?: string;
  image?: string | null;
  onboarded?: boolean;
  isVerified?: boolean;
  twoFactorEnabled?: boolean;
  workspaceId: string | null;
  accessToken: string;
  expiresIn: number;
};

export type JsynqWebhookEndpoint = { id: string; url: string; events: string[]; status: string; secret?: string };
