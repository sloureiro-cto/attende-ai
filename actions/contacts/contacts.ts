"use server"

import { ActionOutput } from "app/_types/Action"
import { Company, ContactDealsList, type ContactKind, DirectoryList, WorkspaceContact } from "app/_types/Contact"
import { unwrapListPayload } from "app/contacts/lib/companySelect"
import { FetchClient, HttpError } from "lib/api"

type Envelope<T> = { success?: boolean; data?: T; items?: T; pagination?: DirectoryList["pagination"] }

function fail(error: unknown, fallback: string): ActionOutput<never> {
  if (error instanceof HttpError) return { success: false, error: error.message }
  return { success: false, error: fallback }
}

export async function listDirectoryAction(input: {
  workspaceId: string
  type?: string
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortDir?: string
  companyId?: string
  channel?: string
  origin?: string
}): Promise<ActionOutput<DirectoryList>> {
  try {
    const payload = await FetchClient.get<Envelope<DirectoryList["items"]>>(
      `${process.env.BACKEND_URL}/workspaces/${input.workspaceId}/directory`,
      {
        query: {
          type: input.type,
          search: input.search,
          page: input.page,
          limit: input.limit,
          sortBy: input.sortBy,
          sortDir: input.sortDir,
          companyId: input.companyId || undefined,
          channel: input.channel || undefined,
          origin: input.origin || undefined,
        },
      }
    )
    return {
      success: true,
      data: {
        items: payload.items ?? [],
        pagination: payload.pagination ?? { total: 0, page: 1, limit: 25, totalPages: 1 },
      },
    }
  } catch (error) {
    return fail(error, "Failed to load directory")
  }
}

export async function listCompaniesAction(workspaceId: string): Promise<ActionOutput<Company[]>> {
  try {
    const payload = await FetchClient.get<Envelope<Company[]>>(
      `${process.env.BACKEND_URL}/workspaces/${workspaceId}/companies`
    )
    return { success: true, data: unwrapListPayload<Company>(payload) }
  } catch (error) {
    return fail(error, "Failed to load companies")
  }
}

export async function createCompanyAction(input: {
  workspaceId: string
  name: string
}): Promise<ActionOutput<Company>> {
  try {
    const payload = await FetchClient.post<Envelope<Company>>(
      `${process.env.BACKEND_URL}/workspaces/${input.workspaceId}/companies`,
      { name: input.name }
    )
    if (!payload.data) return { success: false, error: "Failed to create company" }
    return { success: true, data: payload.data }
  } catch (error) {
    return fail(error, "Failed to create company")
  }
}

export async function getCompanyAction(input: {
  workspaceId: string
  companyId: string
}): Promise<ActionOutput<Company>> {
  try {
    const payload = await FetchClient.get<Envelope<Company>>(
      `${process.env.BACKEND_URL}/workspaces/${input.workspaceId}/companies/${input.companyId}`
    )
    if (!payload.data) return { success: false, error: "Company not found" }
    return { success: true, data: payload.data }
  } catch (error) {
    return fail(error, "Failed to load company")
  }
}

export async function updateCompanyAction(input: {
  workspaceId: string
  companyId: string
  body: Partial<Company> & { address?: Company["address"] }
}): Promise<ActionOutput<Company>> {
  try {
    const payload = await FetchClient.patch<Envelope<Company>>(
      `${process.env.BACKEND_URL}/workspaces/${input.workspaceId}/companies/${input.companyId}`,
      input.body
    )
    if (!payload.data) return { success: false, error: "Failed to update company" }
    return { success: true, data: payload.data }
  } catch (error) {
    return fail(error, "Failed to update company")
  }
}

export async function deleteCompanyAction(input: {
  workspaceId: string
  companyId: string
}): Promise<ActionOutput<true>> {
  try {
    await FetchClient.delete(`${process.env.BACKEND_URL}/workspaces/${input.workspaceId}/companies/${input.companyId}`)
    return { success: true, data: true }
  } catch (error) {
    return fail(error, "Failed to delete company")
  }
}

export async function listCompanyContactsAction(input: {
  workspaceId: string
  companyId: string
}): Promise<ActionOutput<WorkspaceContact[]>> {
  try {
    const payload = await FetchClient.get<Envelope<WorkspaceContact[]>>(
      `${process.env.BACKEND_URL}/workspaces/${input.workspaceId}/companies/${input.companyId}/contacts`
    )
    return { success: true, data: payload.data ?? [] }
  } catch (error) {
    return fail(error, "Failed to load contacts")
  }
}

export async function listLinkedContactsAction(input: {
  workspaceId: string
  contactId: string
}): Promise<ActionOutput<WorkspaceContact[]>> {
  try {
    const payload = await FetchClient.get<Envelope<WorkspaceContact[]>>(
      `${process.env.BACKEND_URL}/workspaces/${input.workspaceId}/contacts/${input.contactId}/contacts`
    )
    return { success: true, data: payload.data ?? [] }
  } catch (error) {
    return fail(error, "Failed to load contacts")
  }
}

export async function createContactAction(input: {
  workspaceId: string
  companyId?: string
  parentContactId?: string
  fullName: string
  pronouns?: string
  email?: string
  phone?: string
  role?: string
  linkedIn?: string
  instagram?: string
  birthdate?: string
  personalId?: string
  notes?: string
  avatarUrl?: string
  kind?: ContactKind
}): Promise<ActionOutput<WorkspaceContact>> {
  try {
    const { workspaceId, ...body } = input
    const payload = await FetchClient.post<Envelope<WorkspaceContact>>(
      `${process.env.BACKEND_URL}/workspaces/${workspaceId}/contacts`,
      body
    )
    if (!payload.data) return { success: false, error: "Failed to create contact" }
    return { success: true, data: payload.data }
  } catch (error) {
    return fail(error, "Failed to create contact")
  }
}

export async function getContactAction(input: {
  workspaceId: string
  contactId: string
}): Promise<ActionOutput<WorkspaceContact>> {
  try {
    const payload = await FetchClient.get<Envelope<WorkspaceContact>>(
      `${process.env.BACKEND_URL}/workspaces/${input.workspaceId}/contacts/${input.contactId}`
    )
    if (!payload.data) return { success: false, error: "Contact not found" }
    return { success: true, data: payload.data }
  } catch (error) {
    return fail(error, "Failed to load contact")
  }
}

export async function getContactsByIdsAction(input: {
  workspaceId: string
  contactIds: string[]
}): Promise<ActionOutput<WorkspaceContact[]>> {
  const uniqueIds = [...new Set(input.contactIds.map((id) => id.trim()).filter(Boolean))]
  if (uniqueIds.length === 0) return { success: true, data: [] }

  try {
    const payload = await FetchClient.get<Envelope<WorkspaceContact[]>>(
      `${process.env.BACKEND_URL}/workspaces/${input.workspaceId}/contacts`,
      { query: { ids: uniqueIds.join(",") } }
    )
    if (Array.isArray(payload.data)) {
      return { success: true, data: payload.data }
    }
  } catch {
    // Fall through to per-id fetches when the batch route is unavailable.
  }

  try {
    const results = await Promise.all(
      uniqueIds.map(async (contactId) => {
        try {
          const payload = await FetchClient.get<Envelope<WorkspaceContact>>(
            `${process.env.BACKEND_URL}/workspaces/${input.workspaceId}/contacts/${contactId}`
          )
          return payload.data ?? null
        } catch {
          return null
        }
      })
    )
    return {
      success: true,
      data: results.filter((contact): contact is WorkspaceContact => Boolean(contact)),
    }
  } catch (error) {
    return fail(error, "Failed to load contacts")
  }
}

export async function updateContactAction(input: {
  workspaceId: string
  contactId: string
  body: Partial<WorkspaceContact>
}): Promise<ActionOutput<WorkspaceContact>> {
  try {
    const payload = await FetchClient.patch<Envelope<WorkspaceContact>>(
      `${process.env.BACKEND_URL}/workspaces/${input.workspaceId}/contacts/${input.contactId}`,
      input.body
    )
    if (!payload.data) return { success: false, error: "Failed to update contact" }
    return { success: true, data: payload.data }
  } catch (error) {
    return fail(error, "Failed to update contact")
  }
}

export async function convertContactToCompanyAction(input: {
  workspaceId: string
  contactId: string
}): Promise<ActionOutput<{ rowType: "company"; id: string; data: Company }>> {
  try {
    const payload = await FetchClient.post<Envelope<{ rowType: "company"; id: string; data: Company }>>(
      `${process.env.BACKEND_URL}/workspaces/${input.workspaceId}/contacts/${input.contactId}/convert-to-company`,
      {}
    )
    if (!payload.data) return { success: false, error: "Failed to convert contact" }
    return { success: true, data: payload.data }
  } catch (error) {
    return fail(error, "Failed to convert contact")
  }
}

export async function convertCompanyToContactAction(input: {
  workspaceId: string
  companyId: string
}): Promise<ActionOutput<{ rowType: "contact"; id: string; data: WorkspaceContact }>> {
  try {
    const payload = await FetchClient.post<Envelope<{ rowType: "contact"; id: string; data: WorkspaceContact }>>(
      `${process.env.BACKEND_URL}/workspaces/${input.workspaceId}/companies/${input.companyId}/convert-to-contact`,
      {}
    )
    if (!payload.data) return { success: false, error: "Failed to convert company" }
    return { success: true, data: payload.data }
  } catch (error) {
    return fail(error, "Failed to convert company")
  }
}

type ContactDealsPayload = {
  items?: ContactDealsList["items"]
  summary?: Partial<ContactDealsList["summary"]> | null
  pagination?: Partial<ContactDealsList["pagination"]> | null
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

export async function listContactDealsAction(input: {
  workspaceId: string
  contactId: string
  page?: number
  limit?: number
  search?: string
}): Promise<ActionOutput<ContactDealsList>> {
  try {
    const payload = await FetchClient.get<ContactDealsPayload>(
      `${process.env.BACKEND_URL}/workspaces/${input.workspaceId}/contacts/${input.contactId}/deals`,
      {
        query: {
          page: input.page,
          limit: input.limit,
          search: input.search,
        },
      }
    )
    const summary = payload.summary
    const pagination = payload.pagination
    const averageTicket = summary?.averageTicketInProgress
    return {
      success: true,
      data: {
        items: Array.isArray(payload.items) ? payload.items : [],
        summary: {
          count: asNumber(summary?.count),
          inProgressValue: asNumber(summary?.inProgressValue),
          doneValue: asNumber(summary?.doneValue),
          lostValue: asNumber(summary?.lostValue),
          averageTicketInProgress:
            typeof averageTicket === "number" && Number.isFinite(averageTicket) ? averageTicket : null,
        },
        pagination: {
          total: asNumber(pagination?.total),
          page: Math.max(1, asNumber(pagination?.page, 1)),
          limit: Math.max(1, asNumber(pagination?.limit, input.limit ?? 25)),
          totalPages: Math.max(1, asNumber(pagination?.totalPages, 1)),
          hasNextPage: Boolean(pagination?.hasNextPage),
        },
      },
    }
  } catch (error) {
    return fail(error, "Failed to load deals")
  }
}

export async function deleteContactAction(input: {
  workspaceId: string
  contactId: string
}): Promise<ActionOutput<true>> {
  try {
    await FetchClient.delete(`${process.env.BACKEND_URL}/workspaces/${input.workspaceId}/contacts/${input.contactId}`)
    return { success: true, data: true }
  } catch (error) {
    return fail(error, "Failed to delete contact")
  }
}
