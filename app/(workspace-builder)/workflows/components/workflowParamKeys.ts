/** Normalize workflow tool input names for picker routing (matches project/epic/card patterns). */

/** True when the value is a workflow template binding like `{{inputs.__trigger.projectId}}`. */
export function isTemplateValue(v: unknown): boolean {
  return typeof v === "string" && v.includes("{{") && v.includes("}}")
}

export function projectParamKey(name: string): boolean {
  const k = name.replace(/_/g, "").toLowerCase()
  return k === "projectid"
}

export function epicParamKey(name: string): boolean {
  const k = name.replace(/_/g, "").toLowerCase()
  return k === "epicid"
}

export function cardParamKey(name: string): boolean {
  const k = name.replace(/_/g, "").toLowerCase()
  return k === "cardid" || k === "todoid" || k === "taskid"
}

export function agentParamKey(name: string): boolean {
  const k = name.replace(/_/g, "").toLowerCase()
  return k === "agentid"
}

export function columnParamKey(name: string): boolean {
  const k = name.replace(/_/g, "").toLowerCase()
  return k === "columnid" || k === "column"
}

export function boardParamKey(name: string): boolean {
  const k = name.replace(/_/g, "").toLowerCase()
  return k === "board"
}

export function statusParamKey(name: string): boolean {
  const k = name.replace(/_/g, "").toLowerCase()
  return k === "statusid" || k === "status" || k === "cardstatus"
}

export function sprintParamKey(name: string): boolean {
  const k = name.replace(/_/g, "").toLowerCase()
  return k === "sprintid" || k === "sprint"
}

export function assigneeParamKey(name: string): boolean {
  const k = name.replace(/_/g, "").toLowerCase()
  return k === "assignee" || k === "assignees"
}

export function reporterParamKey(name: string): boolean {
  const k = name.replace(/_/g, "").toLowerCase()
  return k === "reporter" || k === "reporters"
}

export function phoneParamKey(name: string): boolean {
  const k = name.replace(/_/g, "").toLowerCase()
  return k === "to" || k === "phone" || k === "phonenumber" || k === "contactphone"
}

export function sessionParamKey(name: string): boolean {
  const k = name.replace(/_/g, "").toLowerCase()
  return k === "sessionid" || k === "whatsappsessionid" || k === "smssessionid"
}
