"use client"

import { ArrowLeft, ExternalLink } from "lucide-react"
import Link from "next/link"
import type { AutomationChannel } from "lib/automations/types"
import { ChannelGlyph } from "./ChannelGlyph"
import { jsynqLinesUrl } from "./lineMeta"
import { BOTS_ROUTES } from "../brand"
import { actionClass } from "../ui/actionStyles"
import { PageLayout } from "../ui/PageLayout"
import { PremiumCard } from "../ui/PremiumCard"
import { useBotsAppT } from "../useBotsAppT"

/** Instagram and SMS channels are linked in JSYNQ; this page explains it and deep-links to the right settings tab. */
export function ConnectInfo({ channel }: { channel: Exclude<AutomationChannel, "whatsapp"> }) {
  const { t } = useBotsAppT()
  const instagram = channel === "instagram"
  const title = instagram ? t("lineConnectInstagramTitle") : t("lineConnectSmsTitle")
  return (
    <PageLayout
      title={title}
      width="narrow"
      actions={
        <Link href={`${BOTS_ROUTES.lines}/${channel}`} className={actionClass({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" aria-hidden />
          {t("lineConnectBack")}
        </Link>
      }
    >
      <PremiumCard className="flex flex-col items-start gap-5 p-5 sm:p-8">
        <ChannelGlyph channel={channel} className="size-14" />
        <p className="text-body-14 leading-relaxed text-neutral-600">{instagram ? t("lineConnectInstagramBody") : t("lineConnectSmsBody")}</p>
        <a href={jsynqLinesUrl(channel)} target="_blank" rel="noopener noreferrer" className={actionClass({ size: "lg" })}>
          <ExternalLink className="size-4" aria-hidden />
          {t("lineManageInJsynq")}
        </a>
      </PremiumCard>
    </PageLayout>
  )
}
