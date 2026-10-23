"use client"

import { createContext, useCallback, useContext, useState } from "react"
import { ILabel } from "app/_types/Label"

interface LabelsContextType {
  labels: ILabel[] | null
  setLabels: React.Dispatch<React.SetStateAction<ILabel[] | null>>
  incrementLabels: (labels: ILabel[], replace?: boolean) => void
  replaceLabels: (labels: ILabel[]) => void
}

const LabelsContext = createContext<LabelsContextType | undefined>(undefined)

export const useLabels = (): LabelsContextType => {
  const context = useContext(LabelsContext)
  if (!context) {
    throw new Error("useLabels must be used within a LabelsProvider")
  }
  return context
}

interface LabelsProviderProps {
  children: React.ReactNode
  initialLabels?: ILabel[]
}

export const LabelsProvider: React.FC<LabelsProviderProps> = ({ children, initialLabels }) => {
  const [labels, setLabels] = useState<ILabel[] | null>(initialLabels ?? null)

  const replaceLabels = useCallback((nextLabels: ILabel[]) => {
    setLabels(nextLabels)
  }, [])

  const incrementLabels = (labels: ILabel[], replace = false) => {
    setLabels((prev) => {
      const newLabelsToAdd = labels.filter((label) => !prev?.some((l) => l._id === label._id))

      if (!replace) {
        return [...(prev ?? []), ...newLabelsToAdd]
      }

      const oldLabelsWithNewValues = prev?.map((label) => {
        const newLabel = labels.find((l) => l._id === label._id)
        return newLabel ? newLabel : label
      })

      return [...(oldLabelsWithNewValues ?? []), ...newLabelsToAdd]
    })
  }

  return (
    <LabelsContext.Provider
      value={{
        labels,
        setLabels,
        incrementLabels,
        replaceLabels,
      }}
    >
      {children}
    </LabelsContext.Provider>
  )
}
