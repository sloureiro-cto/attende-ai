"use client"

import { ObjectId } from "mongodb"
import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useState } from "react"
import { ISubscription } from "app/_types/Subscription"
import { IUser } from "app/_types/User"

type MainUsage =
  | "document"
  | "project management"
  | "chat"
  | "email"
  | "calendar"
  | "tasks"
  | "notes"
  | "files"
  | "links"
  | "others"
type Plan = "free" | "pro"
type Status = "active" | "inactive"
type Type = "personal" | "team" | "study"

export interface IWorkspace {
  _id: string
  name: string
  description: string
  subdomain: string
  companyName: string
  companyWebsite: string
  owner: string | ObjectId | IUser
  members: IUser[]
  deleted: boolean
  deletedAt: Date
  deletedBy: string
  logo: string
  type: Type
  plan: Plan
  status: Status
  isPublic: boolean
  isPrivate: boolean
  isArchived: boolean
  mainUsage: MainUsage[]
  subscription: ISubscription | null
  /** Set only when this workspace was created through a seller's link. See docs/RESELLER_PROVIDER_STRIPE_CONNECT.md §3.4. */
  providerId?: string
  landingPageId?: string
  domain?: string
  createdAt: Date
  updatedAt: Date
  language: string
  businessHours?: import("lib/businessHours/types").IWorkspaceBusinessHours
  customBranding?: import("lib/workspace/branding").IWorkspaceCustomBranding
}
export interface IWorkspaceContextType {
  workspaces: IWorkspace[]
  setWorkspaces: Dispatch<SetStateAction<IWorkspace[]>>
  selectedWorkspace: IWorkspace | null
  setSelectedWorkspace: Dispatch<SetStateAction<IWorkspace | null>>
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
  isConvertingWorkspaceIntent: boolean
  setIsConvertingWorkspaceIntent: Dispatch<SetStateAction<boolean>>
  convertedWorkspaceIntent: IWorkspace | null
  setConvertedWorkspaceIntent: Dispatch<SetStateAction<IWorkspace | null>>
  /** True between the user picking a different workspace and the resulting full-page reload landing. Lets global UI (e.g. modals) ignore the transient context update that precedes the reload. */
  isSwitchingWorkspace: boolean
  setIsSwitchingWorkspace: Dispatch<SetStateAction<boolean>>
}
const WorkspaceContext = createContext<IWorkspaceContextType | undefined>(undefined)

export const useWorkspace = (): IWorkspaceContextType => {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider")
  }
  return context
}

export const WorkspaceProvider = ({
  children,
  initialCurrentWorkspace = null,
}: {
  children: ReactNode
  initialCurrentWorkspace?: IWorkspace | null
}) => {
  const [workspaces, setWorkspaces] = useState<IWorkspace[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<IWorkspace | null>(initialCurrentWorkspace)
  const [isLoading, setIsLoading] = useState(false)
  const [isConvertingWorkspaceIntent, setIsConvertingWorkspaceIntent] = useState(false)
  const [convertedWorkspaceIntent, setConvertedWorkspaceIntent] = useState<IWorkspace | null>(null)
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false)

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        setWorkspaces,
        selectedWorkspace,
        setSelectedWorkspace,
        isLoading,
        setIsLoading,
        isConvertingWorkspaceIntent,
        setIsConvertingWorkspaceIntent,
        convertedWorkspaceIntent,
        setConvertedWorkspaceIntent,
        isSwitchingWorkspace,
        setIsSwitchingWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}
