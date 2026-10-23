"use client"

import { LinesSkeleton } from "components/bots-app/lines/LinesSkeleton"
import { useBotsAppT } from "components/bots-app/useBotsAppT"

export default function LinesLoading() {
  const { t } = useBotsAppT()
  return <LinesSkeleton label={t("linesLoading")} />
}
