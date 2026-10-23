"use client"

import type { Statsig } from "@flags-sdk/statsig"
import { StatsigProvider, useClientBootstrapInit } from "@statsig/react-bindings"
import { StatsigAutoCapturePlugin } from "@statsig/web-analytics"
import { useEffect, useMemo } from "react"

export function DynamicStatsigProvider({
  children,
  datafile,
}: {
  children: React.ReactNode
  datafile: Awaited<ReturnType<typeof Statsig.getClientInitializeResponse>>
}) {
  if (!datafile) throw new Error("Missing datafile")

  const initOptions = useMemo(() => ({ plugins: [new StatsigAutoCapturePlugin()] }), [])

  const client = useClientBootstrapInit(
    process.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY as string,
    datafile.user,
    JSON.stringify(datafile),
    initOptions
  )

  useEffect(() => {
    client.updateUserAsync(datafile.user)
  }, [client, datafile.user])

  return <StatsigProvider client={client}>{children}</StatsigProvider>
}
