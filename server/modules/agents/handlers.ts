import 'server-only';
import { codedError } from '../../lib/errors';
import { ok, route, type HttpContext } from '../../lib/http';
import { ctxOf, requireUser, requireWorkspace } from '../../middleware/auth';
import { entitlementGate } from '../billing/gate';
import { fromTemplateBodySchema, patchSetupBodySchema } from './lib/formSchema';
import { KnowledgeService, MAX_DOC_BYTES, type UploadedFile } from './knowledge';
import { jsynqAgentPorts } from './ports';
import { AgentService } from './service';
import { ATTENDE_AGENT_ERROR_CODES as CODES } from './types';

function bodyIssues(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return codedError(400, CODES.VALIDATION, 'Invalid request body', {
    issues: error.issues.map((i) => ({ path: i.path.map(String).join('.'), message: i.message })),
  });
}

/**
 * `/api/attende/agents`: auth, workspace membership, then the plan gate. The workspace always
 * comes from the verified request context, never from the URL or body.
 */
const guards = [requireUser, requireWorkspace, entitlementGate];

const services = (http: HttpContext) => {
  const ctx = ctxOf(http);
  const ports = jsynqAgentPorts(http.deps.user(ctx.token), ctx.workspaceId);
  const agents = new AgentService(ports, http.deps.now);
  return { ctx: { workspaceId: ctx.workspaceId, userId: ctx.userId }, agents, knowledge: new KnowledgeService(agents, ports) };
};
const id = (http: HttpContext) => String(http.params.id);

export const getTemplates = route(guards, async (http) => ok({ templates: services(http).agents.listTemplates() }));

export const postFromTemplate = route(guards, async (http) => {
  const { ctx, agents } = services(http);
  const parsed = fromTemplateBodySchema.safeParse(await http.body());
  if (!parsed.success) throw bodyIssues(parsed.error);
  const { view, created } = await agents.createFromTemplate(ctx, parsed.data);
  return ok(view, created ? 201 : 200);
});

export const listAgents = route(guards, async (http) => {
  const { ctx, agents } = services(http);
  return ok({ agents: await agents.list(ctx.workspaceId) });
});

export const getAgent = route(guards, async (http) => {
  const { ctx, agents } = services(http);
  return ok(await agents.get(ctx.workspaceId, id(http)));
});

export const patchSetup = route(guards, async (http) => {
  const { ctx, agents } = services(http);
  const parsed = patchSetupBodySchema.safeParse(await http.body());
  if (!parsed.success) throw bodyIssues(parsed.error);
  return ok(await agents.patchSetup(ctx, id(http), parsed.data));
});

export const postGoLive = route(guards, async (http) => {
  const { ctx, agents } = services(http);
  return ok(await agents.goLive(ctx, id(http)));
});

export const postPause = route(guards, async (http) => {
  const { ctx, agents } = services(http);
  return ok(await agents.pause(ctx, id(http)));
});

export const postTest = route(guards, async (http) => {
  const { ctx, agents } = services(http);
  const body = ((await http.body()) ?? {}) as { message?: unknown; at?: unknown };
  const message = typeof body.message === 'string' ? body.message.slice(0, 2000) : undefined;
  const at = typeof body.at === 'string' && !Number.isNaN(Date.parse(body.at)) ? new Date(body.at) : undefined;
  return ok(await agents.test(ctx, id(http), { message, at }));
});

export const listKnowledge = route(guards, async (http) => {
  const { ctx, knowledge } = services(http);
  return ok({ documents: await knowledge.list(ctx, id(http)) });
});

/** Multipart `file` (one file, up to `MAX_DOC_BYTES`), as multer read it in the Express service. */
async function uploadedFile(http: HttpContext): Promise<UploadedFile | undefined> {
  const tooLarge = () =>
    codedError(413, CODES.FILE_REJECTED, `File exceeds ${MAX_DOC_BYTES / 1024 / 1024} MB`, { reason: 'size', maxBytes: MAX_DOC_BYTES });
  if (!/^multipart\/form-data/i.test(http.header('content-type') ?? '')) return undefined;
  // Multipart overhead aside, a body this large cannot hold an allowed file.
  if (Number(http.header('content-length') ?? 0) > MAX_DOC_BYTES + 1024 * 1024) throw tooLarge();
  let form: FormData;
  try {
    form = await http.req.formData();
  } catch {
    return undefined;
  }
  const file = form.get('file');
  if (!file || typeof file === 'string') return undefined;
  if (file.size > MAX_DOC_BYTES) throw tooLarge();
  return { originalname: file.name, mimetype: file.type || 'application/octet-stream', size: file.size, buffer: Buffer.from(await file.arrayBuffer()) };
}

export const postKnowledge = route(guards, async (http) => {
  const { ctx, knowledge } = services(http);
  const file = await uploadedFile(http);
  return ok(await knowledge.upload(ctx, id(http), file), 201);
});

export const deleteKnowledge = route(guards, async (http) => {
  const { ctx, knowledge } = services(http);
  await knowledge.remove(ctx, id(http), String(http.params.documentId));
  return ok({ removed: true });
});
