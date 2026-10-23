"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { AgentActionError } from "lib/attende/agents/types"
import { ErrorNotice } from "./PlanNotice"
import { useAttendeAgentsT } from "./useAttendeAgentsT"
import { actionClass } from "../ui/actionStyles"
import { EmptyState } from "../ui/EmptyState"
import { PageLayout } from "../ui/PageLayout"

/** The agent could not be read: unknown id, another workspace's agent, plan problem or network. */
export function AgentLoadError({ error }: { error: AgentActionError }) {
  const { t } = useAttendeAgentsT()
  const router = useRouter()
  const notFound = error.code === "ATTENDE_AGENT_NOT_FOUND" || error.status === 404
  return (
    <PageLayout title={t("listTitle")}>
      {notFound ? (
        <EmptyState
          title={t("errorNotFound")}
          action={
            <Link href="/ai-agents" className={actionClass({ variant: "secondary", size: "lg" })}>
              <ArrowLeft className="size-4" aria-hidden />
              {t("backToAgents")}
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <ErrorNotice error={error} onRetry={() => router.refresh()} />
          <Link href="/ai-agents" className={actionClass({ variant: "ghost", size: "md", className: "w-fit" })}>
            <ArrowLeft className="size-4" aria-hidden />
            {t("backToAgents")}
          </Link>
        </div>
      )}
    </PageLayout>
  )
}
