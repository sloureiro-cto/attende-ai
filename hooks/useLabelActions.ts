"use client"

import { useCallback } from "react"
import { createLabelAction } from "actions/labels/createLabel"
import { deleteLabelAction } from "actions/labels/deleteLabel"
import { getLabelsAction } from "actions/labels/getLabels"
import { updateLabelAction } from "actions/labels/updateLabel"
import { CreateLabelDTO, ILabel, UpdateLabelDTO } from "app/_types/Label"
import { showToast } from "app/utils/showToast"
import { useCard } from "context/CardContext"
import { useProjects } from "context/ProjectContext"
import { useLabels } from "context/ProjectLabelsContext"
import { useProjectsTranslation } from "hooks/useProjectsTranslation"

export const useLabelActions = () => {
  const { t } = useProjectsTranslation()
  const { setLabels, labels } = useLabels()
  const { currentProject } = useProjects()
  const { currentCard, setCurrentCard } = useCard()

  const getLabels = useCallback(async (projectId: string) => {
    const { success, error, data: labels } = await getLabelsAction(projectId)

    if (!success || error || !labels) {
      showToast("error", t("failedToGetLabels"))
      return null
    }

    setLabels(labels)
    return labels
  }, [setLabels, t])

  const createLabel = async (data: CreateLabelDTO) => {
    const { success, error, data: label } = await createLabelAction(data)

    if (!success || error || !label) {
      showToast("error", t("failedToCreateLabel"))
      return null
    }

    setLabels((oldLabels) => {
      if (!oldLabels) return [label]
      return [...oldLabels, label]
    })

    return label
  }

  const deleteLabel = async ({ projectId, labelId }: { projectId: string; labelId: string }) => {
    const oldLabel = labels?.find((label) => label._id === labelId) as ILabel | undefined

    setLabels((oldLabels) => {
      if (!oldLabels) return []
      return oldLabels.filter((label) => label._id !== labelId)
    })

    const { success, error } = await deleteLabelAction({ projectId, labelId })

    if (!success || error) {
      showToast("error", t("failedToRemoveLabel"))
      setLabels((oldLabels) => {
        if (!oldLabels) return oldLabel ? [oldLabel] : []
        return [...oldLabels, oldLabel ?? undefined] as ILabel[]
      })
      return null
    }

    return true
  }

  const buildUpdatedLabel = (label: ILabel, data: Partial<UpdateLabelDTO>): ILabel => {
    const merged = { ...label, ...data }
    const pattern = merged.pattern === null ? undefined : merged.pattern
    return { ...merged, pattern } as ILabel
  }

  const updateLabel = async ({ labelId, data }: { labelId: string; data: Partial<UpdateLabelDTO> }) => {
    const oldLabel = labels?.find((label) => label._id === labelId) as ILabel | undefined

    if (currentCard && setCurrentCard) {
      setCurrentCard((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          labels: (prev.labels ?? []).map((label) =>
            label._id?.toString() === labelId ? buildUpdatedLabel(label, data) : label
          ),
        }
      })
    }

    setLabels((oldLabels) => {
      if (!oldLabels) return []
      return oldLabels.map((label) => {
        if (label._id?.toString() !== labelId) return label
        return buildUpdatedLabel(label, data)
      })
    })

    const { success, error } = await updateLabelAction({
      projectId: currentProject?._id.toString() ?? "",
      labelId,
      data,
    })

    if (!success || error) {
      showToast("error", t("failedToUpdateLabel"))
      setLabels((oldLabels) => {
        if (!oldLabels) return oldLabel ? [oldLabel] : []
        return oldLabels.map((label) => (label._id === labelId ? oldLabel ?? label : label))
      })

      if (currentCard) {
        setCurrentCard((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            labels: (prev.labels ?? []).map((label) => (label._id?.toString() === labelId ? oldLabel ?? label : label)),
          }
        })
      }
      return null
    }

    return true
  }

  return {
    getLabels,
    createLabel,
    deleteLabel,
    updateLabel,
  }
}
