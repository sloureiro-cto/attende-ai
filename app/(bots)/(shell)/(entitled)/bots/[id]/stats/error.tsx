"use client"

import { AlertTriangle } from "lucide-react"
import { useStatsT } from "components/bots-app/stats/useStatsT"
import { EmptyState } from "components/bots-app/ui/EmptyState"
import Button from "components/Button/Button"

export default function BotStatsError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useStatsT()
  return (
    <EmptyState
      title={t("errorTitle")}
      description={t("errorBody")}
      icon={<AlertTriangle size={22} aria-hidden />}
      action={
        <Button type="button" variant="secondary" style="outline" size="medium" onClick={reset}>
          {t("retry")}
        </Button>
      }
    />
  )
}
