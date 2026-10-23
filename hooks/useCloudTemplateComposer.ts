"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  approvedCloudTemplatesForSession,
  buildCloudTemplateSendPayload,
  cloudTemplateBodyText,
  cloudTemplateHeaderFormat,
  cloudTemplatePreview,
  cloudTemplateVarKeys,
} from "@/lib/whatsapp-lite/cloudTemplateSendHelpers"
import { listCloudTemplatesAction } from "actions/whatsapp-lite/cloudTemplates"
import type { WhatsAppCloudTemplate } from "actions/whatsapp-lite/types"

export function useCloudTemplateComposer(options?: { wabaId?: string | null; sessionId?: string | null }) {
  const wabaId = options?.wabaId
  const sessionId = options?.sessionId?.trim() || undefined
  const [templates, setTemplates] = useState<WhatsAppCloudTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [vars, setVars] = useState<Record<string, string>>({})
  const [headerUrl, setHeaderUrl] = useState("")

  const approved = useMemo(() => approvedCloudTemplatesForSession(templates, wabaId), [templates, wabaId])

  useEffect(() => {
    setTemplates([])
    setSelectedTemplateId("")
    setVars({})
    setHeaderUrl("")
  }, [sessionId, wabaId])

  useEffect(() => {
    if (!selectedTemplateId) return
    if (!approved.some((tpl) => tpl._id === selectedTemplateId)) {
      setSelectedTemplateId("")
      setVars({})
      setHeaderUrl("")
    }
  }, [approved, selectedTemplateId])

  const selectedTemplate = useMemo(
    () => approved.find((tpl) => tpl._id === selectedTemplateId) ?? null,
    [approved, selectedTemplateId]
  )

  const bodyText = useMemo(() => cloudTemplateBodyText(selectedTemplate), [selectedTemplate])
  const headerFormat = useMemo(() => cloudTemplateHeaderFormat(selectedTemplate), [selectedTemplate])
  const varKeys = useMemo(() => cloudTemplateVarKeys(bodyText), [bodyText])
  const preview = useMemo(() => cloudTemplatePreview(bodyText, vars), [bodyText, vars])

  const reset = useCallback(() => {
    setSelectedTemplateId("")
    setVars({})
    setHeaderUrl("")
  }, [])

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listCloudTemplatesAction(sessionId)
      if (!res.success) {
        return { success: false as const, error: res.error }
      }
      setTemplates(res.data)
      return { success: true as const }
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  const validate = useCallback((): string | null => {
    if (!selectedTemplate) return "template_required"
    const allFilled = varKeys.every((k) => (vars[k] ?? "").trim().length > 0)
    if (!allFilled) return "vars_required"
    if (headerFormat && !headerUrl.trim()) return "header_url_required"
    return null
  }, [headerFormat, headerUrl, selectedTemplate, varKeys, vars])

  const buildSendPayload = useCallback(() => {
    if (!selectedTemplate) return null
    return buildCloudTemplateSendPayload({
      template: selectedTemplate,
      vars,
      headerUrl,
      bodyText,
    })
  }, [bodyText, headerUrl, selectedTemplate, vars])

  return {
    templates,
    loading,
    approved,
    selectedTemplateId,
    setSelectedTemplateId: (id: string) => {
      setSelectedTemplateId(id)
      setVars({})
      setHeaderUrl("")
    },
    vars,
    setVars,
    headerUrl,
    setHeaderUrl,
    selectedTemplate,
    bodyText,
    headerFormat,
    varKeys,
    preview,
    reset,
    loadTemplates,
    validate,
    buildSendPayload,
  }
}
