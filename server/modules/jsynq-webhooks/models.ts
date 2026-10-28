import 'server-only';
import mongoose, { Schema, type Model } from 'mongoose';

const model = <T>(name: string, schema: Schema<T>): Model<T> => (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);

/** Usage and blocked-reply events from JSYNQ, kept 90 days for support and in-app notices. */
export interface IWorkspaceEvent {
  _id: string;
  workspaceId: string;
  type: string;
  data: Record<string, unknown>;
  occurredAt: Date;
}
const WorkspaceEventSchema = new Schema<IWorkspaceEvent>(
  { _id: String, workspaceId: { type: String, required: true }, type: { type: String, required: true }, data: Schema.Types.Mixed, occurredAt: Date },
  { collection: 'workspace_events', versionKey: false, timestamps: { createdAt: true, updatedAt: false } }
);
WorkspaceEventSchema.index({ workspaceId: 1, occurredAt: -1 });
WorkspaceEventSchema.index({ occurredAt: 1 }, { expireAfterSeconds: 90 * 86_400 });
export const WorkspaceEventModel = model('WorkspaceEvent', WorkspaceEventSchema);

/** Last known connection state of each line (JSYNQ `channel.*` events). */
export interface IChannelStatus {
  workspaceId: string;
  channel: string;
  sessionId: string;
  status: 'connected' | 'disconnected';
  reason?: string;
  changedAt: Date;
}
const ChannelStatusSchema = new Schema<IChannelStatus>(
  {
    workspaceId: { type: String, required: true },
    channel: { type: String, required: true },
    sessionId: { type: String, required: true },
    status: { type: String, required: true },
    reason: String,
    changedAt: { type: Date, required: true },
  },
  { collection: 'channel_status', timestamps: true }
);
ChannelStatusSchema.index({ workspaceId: 1, channel: 1, sessionId: 1 }, { unique: true });
export const ChannelStatusModel = model('ChannelStatus', ChannelStatusSchema);
