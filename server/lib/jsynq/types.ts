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
  /** `all_inbound` = every inbound of the session; `conversation` = only `targetId`. */
  targetType?: string;
  targetId?: string | null;
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

export type JsynqProject = {
  _id: string;
  title?: string;
  projectType?: { title?: string } | string | null;
  /** Default board of the project. */
  board?: string | { _id?: string } | null;
  tabs?: Array<{ type?: string; boardId?: string | null; boardType?: string; order?: number }>;
  createdAt?: string;
};

/** `GET /api/projects/:p/columns/kanban`. */
export type JsynqKanbanColumns = {
  projectId?: string;
  boardId?: string | null;
  columns?: Array<{ columnId: string; title?: string; statusId?: string | null; statusTitle?: string; columnStatus?: string | null }>;
};

/** A card as `/cards/paginated` returns it (lean; `contactIds` populated, the other refs are ids). */
export type JsynqCard = {
  _id: string;
  title?: string;
  project?: string | { _id?: string };
  board?: string | { _id?: string } | null;
  column?: string | { _id?: string } | null;
  contactIds?: Array<string | { _id: string; fullName?: string; email?: string; phone?: string; avatarUrl?: string | null }>;
  assignedUsers?: Array<string | { _id: string }>;
  labels?: Array<string | { _id: string }>;
  leadSource?: Array<string | { _id: string }> | string | null;
  cardProducts?: Array<{ product?: unknown; quantity?: number; price?: number; discount?: { type?: string; value?: number } | null }> | null;
  customFields?: Array<{ fieldId?: string; fieldType?: string; value?: unknown }> | null;
  cardStatus?: string | null;
  lastMessageAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type JsynqDirectoryEntry = {
  id: string;
  rowType: string;
  name?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  responsibleUserId?: string;
  contactId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type JsynqContactDeal = { id: string; columnId?: string; cardStatus?: string; updatedAt?: string | null };

export type JsynqConversationStateEntry = { state?: string; changedAt?: string; changedBy?: string; reason?: string };

/** A conversation document as the inbox / CRM routes return it. */
export type JsynqConversation = {
  _id: string;
  sessionId?: string;
  createdAt?: string;
  lastMessageAt?: string | null;
  lastMessageDirection?: 'inbound' | 'outbound' | null;
  conversationState?: string | null;
  conversationStateHistory?: JsynqConversationStateEntry[];
  automationBindingId?: string | null;
  activeAgent?: { _id?: string; name?: string } | null;
  linkedEntityType?: string | null;
  linkedEntityId?: string | null;
  crmProjectId?: string | null;
  deletedAt?: string | null;
  assignedUserId?: string | null;
  /** WhatsApp / SMS contact; Instagram has `displayName` / `attendeeUsername`. */
  contactName?: string | null;
  contactPhone?: string | null;
  displayName?: string | null;
  attendeeUsername?: string | null;
};

export type JsynqInboxRow = { channel: Channel; sessionId: string; conversation: JsynqConversation };

export type JsynqMessage = {
  _id: string;
  conversationId?: string;
  /** The text (WhatsApp content comes back decrypted by JSYNQ). Read only by the worker, never stored or logged. */
  content?: string | null;
  /** The member who sent it (`senderType: 'user'`). */
  senderId?: string | null;
  direction?: 'inbound' | 'outbound';
  senderType?: 'contact' | 'agent' | 'user' | string;
  agentExecutionId?: string | null;
  /** WhatsApp / Instagram: `inbound_rule` = a template automation, `agent` = an AI agent. */
  senderAgent?: { source?: string } | null;
  status?: string;
  createdAt?: string;
};

export type JsynqTool = { toolId: string; toolName: string; provider?: string };
