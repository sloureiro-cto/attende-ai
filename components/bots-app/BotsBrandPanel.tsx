"use client"

import { Chart2, Flash, Link21 } from "iconsax-react"
import { BotFlowIllustration } from "./BotFlowIllustration"
import { BrandMark } from "./BrandMark"
import { GlassPanel } from "./ui/GlassPanel"
import { useBotsAppT } from "./useBotsAppT"

/** Dark brand side of the login screen: headline, animated flow illustration, three proof points. */
export function BotsBrandPanel() {
  const { t } = useBotsAppT()
  const points = [
    { icon: <Flash size={16} variant="Bold" />, label: t("brandPointFlows") },
    { icon: <Chart2 size={16} variant="Bold" />, label: t("brandPointStats") },
    { icon: <Link21 size={16} />, label: t("brandPointLines") },
  ]

  return (
    <aside className="bots-ink-panel bots-grid relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
      <BrandMark tone="dark" size={36} />

      <div className="flex flex-col gap-10">
        <div className="flex max-w-xl flex-col gap-4">
          <h2 className="bots-text-gradient text-[40px] font-semibold leading-[1.08] tracking-tight xl:text-[46px]">
            {t("brandHeadline")}
          </h2>
          <p className="max-w-md text-body-16 text-white/65">{t("brandSubline")}</p>
        </div>

        <div className="-mx-2 self-center">
          <BotFlowIllustration />
        </div>

        <ul className="flex flex-col gap-2.5">
          {points.map((point) => (
            <li key={point.label}>
              <GlassPanel className="flex items-center gap-3 px-4 py-3 text-body-14 text-white/85">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/25 text-primary-light">
                  {point.icon}
                </span>
                {point.label}
              </GlassPanel>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
