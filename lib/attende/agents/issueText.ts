import type { AttendeAgentsKey } from "lib/i18n/translations/attende/agents"
import type { FieldIssue, IssueCode } from "./form"

const KEY: Record<IssueCode, AttendeAgentsKey> = {
  required: "issueRequired",
  max: "issueMax",
  min: "issueMin",
  itemMax: "issueItemMax",
  url: "issueUrl",
  number: "issueNumber",
  range: "issueRange",
  hours: "issueHours",
  itemIncomplete: "issueItemIncomplete",
  receptionistContent: "issueReceptionist",
  price: "issuePrice",
}

export const issueKey = (issue: FieldIssue): AttendeAgentsKey => KEY[issue.code]

/** Server-side validation issues (`details.issues`) carry free text from the backend; unknown paths are shown in the summary only. */
export function serverIssuesToMap(issues: Array<{ path: string; message: string }> | undefined): Record<string, string> {
  return Object.fromEntries((issues ?? []).map((i) => [i.path, i.message]))
}
