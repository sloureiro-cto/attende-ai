import 'server-only';
import mongoose, { Schema, type Model } from 'mongoose';
import type { AttendeeAgentForm, AttendeeChannel, AttendeeTemplateKey } from './types';

export type AgentLine = { channel: AttendeeChannel; sessionId: string; bindingId?: string };
export type KnowledgeDoc = { documentId: string; name: string; mimeType?: string; sizeBytes?: number; uploadedAt: Date };

/**
 * One Attende agent: the form (source of truth), the JSYNQ agent and bindings it produced, and
 * the documents uploaded through it. JSYNQ agents carry no metadata, so the ids of everything this
 * service creates in JSYNQ are tracked here; `state` + `pending` let the sweeper clean up after a
 * create that died half way.
 */
export interface IAgentSetup {
  _id: mongoose.Types.ObjectId;
  workspaceId: string;
  /** JSYNQ agent id; absent only while `creating`. */
  agentId?: string;
  templateKey: AttendeeTemplateKey;
  form: AttendeeAgentForm;
  lines: AgentLine[];
  crm?: { projectId: string; columnId: string };
  clientRequestId: string;
  documents: KnowledgeDoc[];
  state: 'creating' | 'ready' | 'failed';
  /** JSYNQ resources created by an unfinished create (for rollback / the sweeper). */
  pending?: { agentId?: string; bindingIds: string[] };
  /** sha256 of the prompt last pushed to JSYNQ: a different prompt there = edited outside. */
  compiledPromptHash?: string;
  lastTestPassedAt?: Date;
  liveSince?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const AgentSetupSchema = new Schema<IAgentSetup>(
  {
    workspaceId: { type: String, required: true },
    agentId: String,
    templateKey: { type: String, enum: ['sdr', 'closer', 'receptionist'], required: true },
    form: { type: Schema.Types.Mixed, required: true },
    lines: {
      type: [new Schema<AgentLine>({ channel: { type: String, required: true }, sessionId: { type: String, required: true }, bindingId: String }, { _id: false })],
      default: [],
    },
    crm: { type: new Schema({ projectId: String, columnId: String }, { _id: false }), default: undefined },
    clientRequestId: { type: String, required: true },
    documents: {
      type: [new Schema<KnowledgeDoc>({ documentId: { type: String, required: true }, name: String, mimeType: String, sizeBytes: Number, uploadedAt: Date }, { _id: false })],
      default: [],
    },
    state: { type: String, enum: ['creating', 'ready', 'failed'], default: 'creating' },
    pending: { type: Schema.Types.Mixed },
    compiledPromptHash: String,
    lastTestPassedAt: Date,
    liveSince: Date,
    createdBy: { type: String, required: true },
  },
  { timestamps: true, collection: 'agent_setups' }
);

AgentSetupSchema.index({ workspaceId: 1, clientRequestId: 1 }, { unique: true });
AgentSetupSchema.index({ workspaceId: 1, agentId: 1 }, { unique: true, partialFilterExpression: { agentId: { $type: 'string' } } });
AgentSetupSchema.index({ workspaceId: 1, createdAt: -1 });
AgentSetupSchema.index({ state: 1, updatedAt: 1 });

export const AgentSetupModel: Model<IAgentSetup> =
  (mongoose.models.AgentSetup as Model<IAgentSetup>) || mongoose.model<IAgentSetup>('AgentSetup', AgentSetupSchema);
