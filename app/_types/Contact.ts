import { IPagination } from "./Pagination"

export type DirectoryRowType = "lead" | "contact" | "company" | "stakeholder"
export type DirectoryTab = "all" | "lead" | "contact" | "company"
export type ContactKind = "contact" | "stakeholder"

export interface DirectoryEntry {
  id: string
  rowType: DirectoryRowType
  name: string
  contactName?: string
  phone: string
  instagram: string
  email: string
  companyId?: string
  contactId?: string
  leadCardId?: string
  leadProjectId?: string
  /** Saved photo, when there is one. */
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

export interface DirectoryList {
  items: DirectoryEntry[]
  pagination: IPagination
}

export interface ContactDeal {
  id: string
  title: string
  slug?: string
  /** Project tab that owns the card's board; empty when unresolved. */
  tabId?: string
  projectId: string
  projectName: string
  columnId: string
  cardStatus: string
  companyId: string
  contactIds: string[]
  estimateRevenue: number | null
  createdAt: string
  updatedAt: string
}

export interface ContactDealsSummary {
  count: number
  inProgressValue: number
  doneValue: number
  lostValue: number
  averageTicketInProgress: number | null
}

export interface ContactDealsPagination {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
}

export interface ContactDealsList {
  items: ContactDeal[]
  summary: ContactDealsSummary
  pagination: ContactDealsPagination
}

export interface CompanyAddress {
  line1: string
  line2: string
  zip: string
  country: string
  state: string
  city: string
}

export interface Company {
  id: string
  workspaceId: string
  name: string
  companyId: string
  birthdate: string
  domain: string
  website: string
  instagram: string
  industry: string
  companySize: string
  notes: string
  phone: string
  email: string
  avatarUrl: string
  address: CompanyAddress
  createdAt: string
  updatedAt: string
}

export interface WorkspaceContact {
  id: string
  workspaceId: string
  companyId: string
  parentContactId: string
  companyName: string
  fullName: string
  pronouns: string
  email: string
  phone: string
  role: string
  linkedIn: string
  instagram: string
  birthdate: string
  personalId: string
  notes: string
  avatarUrl: string
  sourceLeadCardId: string
  address: CompanyAddress
  kind: ContactKind
  createdAt: string
  updatedAt: string
}

export const COMPANY_SIZES = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1.000 employees",
  "1.001-5.000 employees",
  "5.001-10.000 employees",
  "10.001+ employees",
] as const

export const COUNTRIES = [
  { value: "United states", label: "United states" },
  { value: "Brazil", label: "Brazil" },
  { value: "Portugal", label: "Portugal" },
  { value: "Spain", label: "Spain" },
  { value: "United kingdom", label: "United kingdom" },
  { value: "Canada", label: "Canada" },
  { value: "Mexico", label: "Mexico" },
  { value: "Argentina", label: "Argentina" },
] as const
