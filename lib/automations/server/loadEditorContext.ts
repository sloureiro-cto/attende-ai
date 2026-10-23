import { getAgents } from "actions/agents/getAgents"
import { listInstagramSessionsAction } from "actions/instagram-lite/sessions"
import { getProjectsAction } from "actions/projects/getProjects"
import { listSmsSessionsAction } from "actions/sms-lite/sessions"
import { listWhatsAppSessionsAction } from "actions/whatsapp-lite"
import { getMessagingSettingsWorkspaceId } from "app/settings/workspace/messages/requireMessagingSettingsAccess"
import { projectHasCrmBoard } from "lib/utils/projectType"
import { isSelectableWhatsAppAutomationSession } from "lib/whatsapp-lite/selectableWhatsAppAutomationSessions"
import type { EditorContextData } from "../editorContext"

type Sessions = EditorContextData["sessions"]

/** Sessions of the three channels. A failed list degrades to empty instead of failing the page. */
export async function loadSessionOptions(): Promise<Sessions> {
  const [wa, ig, sms] = await Promise.all([listWhatsAppSessionsAction(), listInstagramSessionsAction(), listSmsSessionsAction()])
  return {
    whatsapp: wa.success
      ? wa.data.map((s) => ({ id: s._id, label: s.label, detail: s.phoneNumber ?? undefined, selectable: isSelectableWhatsAppAutomationSession(s) }))
      : [],
    instagram: ig.success
      ? ig.data.map((s) => ({
          id: s._id,
          label: s.label,
          detail: s.instagramUsername ? `@${s.instagramUsername}` : undefined,
          selectable: s.status === "active",
        }))
      : [],
    sms: sms.success ? sms.data.map((s) => ({ id: s._id, label: s.label, detail: s.fromNumber, selectable: s.status !== "disabled" })) : [],
  }
}

/** Sessions, agents and CRM projects in parallel (the rule editor needs all of them). */
export async function loadEditorContext(): Promise<EditorContextData> {
  const workspaceId = await getMessagingSettingsWorkspaceId()
  const [sessions, agents, projects] = await Promise.all([
    loadSessionOptions(),
    getAgents(workspaceId, { limit: 100, offset: 0 }),
    getProjectsAction({ limit: 100, archieved: false }),
  ])
  return {
    workspaceId,
    sessions,
    agents:
      agents.success && agents.data
        ? agents.data.map((a) => ({ _id: a._id, name: a.name, icon: (a as { icon?: string | null }).icon ?? null }))
        : [],
    crmProjects: projects.success ? projects.data.filter((p) => projectHasCrmBoard(p)) : [],
  }
}
