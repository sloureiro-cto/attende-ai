import 'server-only';
import { codedError } from '../../lib/errors';
import { viaJsynq } from '../../lib/jsynq';
import { errMessage, log } from '../../lib/logger';
import { AgentSetupModel } from './models';
import type { AgentPorts } from './ports';
import type { AgentContext, AgentService } from './service';
import { ATTENDE_AGENT_ERROR_CODES as CODES } from './types';

/** Business documents only: keep uploads small and cheap to embed. */
export const MAX_DOC_BYTES = 20 * 1024 * 1024;
export const ALLOWED_DOC_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'text/csv',
]);

export type UploadedFile = { originalname: string; mimetype: string; size: number; buffer: Buffer };

export type KnowledgeDocView = {
  documentId: string;
  name: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedAt: string;
  /** `pending` until JSYNQ's first indexing pass creates the knowledge source. */
  indexStatus: 'pending' | 'processing' | 'ready' | 'failed' | 'skipped';
  pageCount?: number;
  errorMessage?: string;
};

/** Documents of an agent: uploaded to the JSYNQ workspace knowledge, listed with their index status. */
export class KnowledgeService {
  constructor(
    private readonly agents: AgentService,
    private readonly ports: AgentPorts
  ) {}

  async list(ctx: AgentContext, id: string): Promise<KnowledgeDocView[]> {
    const setup = await this.agents.load(ctx.workspaceId, id);
    const status = await viaJsynq(() => this.ports.indexStatus(setup.documents.map((d) => d.documentId)));
    return setup.documents.map((d) => {
      const s = status.get(d.documentId);
      return {
        documentId: d.documentId,
        name: d.name,
        ...(d.mimeType ? { mimeType: d.mimeType } : {}),
        ...(d.sizeBytes !== undefined ? { sizeBytes: d.sizeBytes } : {}),
        uploadedAt: new Date(d.uploadedAt).toISOString(),
        indexStatus: (s?.status as KnowledgeDocView['indexStatus']) ?? 'pending',
        ...(s?.pageCount ? { pageCount: s.pageCount } : {}),
        ...(s?.errorMessage ? { errorMessage: s.errorMessage } : {}),
      };
    });
  }

  async upload(ctx: AgentContext, id: string, file: UploadedFile | undefined): Promise<KnowledgeDocView> {
    if (!file) throw codedError(400, CODES.FILE_REJECTED, 'File is required', { reason: 'missing' });
    if (!ALLOWED_DOC_MIME_TYPES.has(file.mimetype)) throw codedError(415, CODES.FILE_REJECTED, 'File type not allowed', { reason: 'type', mimeType: file.mimetype });
    if (file.size > MAX_DOC_BYTES) throw codedError(413, CODES.FILE_REJECTED, `File exceeds ${MAX_DOC_BYTES / 1024 / 1024} MB`, { reason: 'size', maxBytes: MAX_DOC_BYTES });

    const setup = await this.agents.load(ctx.workspaceId, id);
    // Plan: every library document of the workspace knowledge in JSYNQ, not only this agent's.
    await this.ports.assertPlanAllows('docs');

    const doc = await viaJsynq(() => this.ports.uploadDocument(file));
    const entry = { documentId: doc.id, name: doc.name, mimeType: file.mimetype, sizeBytes: file.size, uploadedAt: new Date() };
    try {
      await AgentSetupModel.updateOne({ _id: setup._id, workspaceId: ctx.workspaceId }, { $push: { documents: entry } });
    } catch (error) {
      // Do not leave an indexed orphan the client cannot see or delete.
      await this.ports.deleteDocument(doc.id).catch((e) => log.warn('knowledge.orphan_delete_failed', { documentId: doc.id, error: errMessage(e) }));
      throw error;
    }
    return { ...entry, uploadedAt: entry.uploadedAt.toISOString(), indexStatus: 'pending' };
  }

  async remove(ctx: AgentContext, id: string, documentId: string): Promise<void> {
    const setup = await this.agents.load(ctx.workspaceId, id);
    // Only documents uploaded through THIS agent can be deleted here: never any other library file.
    if (!setup.documents.some((d) => d.documentId === documentId)) throw codedError(404, CODES.AGENT_NOT_FOUND, 'Document not found');
    await viaJsynq(() => this.ports.deleteDocument(documentId)).catch((error) => {
      if ((error as { reference?: string }).reference !== 'JSYNQ_NOT_FOUND') throw error;
    });
    await AgentSetupModel.updateOne({ _id: setup._id, workspaceId: ctx.workspaceId }, { $pull: { documents: { documentId } } });
  }
}
