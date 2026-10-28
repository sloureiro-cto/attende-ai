import 'server-only';
/** Shapes of the JSYNQ responses this service reads. Only the fields we use. */

export type Channel = 'whatsapp' | 'instagram' | 'sms';

export type JsynqAgent = {
  id: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  isActive?: boolean;
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

export type JsynqLanguage = 'portuguese' | 'english' | 'spanish';
export const JSYNQ_LANGUAGE: Record<'pt' | 'en' | 'es', JsynqLanguage> = { pt: 'portuguese', en: 'english', es: 'spanish' };

/** What JSYNQ answers at login / signup verification (`BuildAuthUserLoginResponseService`). No token: the app mints it. */
export type JsynqLoginSummary = {
  id: string;
  email: string;
  name?: string;
  image?: string | null;
  onboarded?: boolean;
  isVerified?: boolean;
  twoFactorEnabled?: boolean;
  workspaceId: string | null;
  stripeCustomerId?: string;
};

export type JsynqOwnedWorkspace = { _id: string; name?: string; createdAt?: string; deleted?: boolean };

export type JsynqProject = { _id: string; title?: string; projectType?: { title?: string } | string | null };

export type JsynqTool = { toolId: string; toolName: string; provider?: string };
