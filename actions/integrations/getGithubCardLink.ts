"use server"

import { ActionOutput } from "app/_types/Action"
import { FetchClient, HttpError } from "lib/api"

export interface GithubRepoLink {
  repoOwner: string
  repoName: string
  branchName: string | null
  branchUrl: string | null
  pr: {
    url: string
    number: number
    title?: string
    author: { login: string; avatarUrl?: string }
  } | null
}

export interface GithubCardLinkResult {
  branchName: string | null
  branchUrl: string | null
  repoOwner?: string
  repoName?: string
  pr: {
    url: string
    number: number
    title?: string
    author: { login: string; avatarUrl?: string }
  } | null
  /** When project has multiple GitHub integrations, one entry per connected repo. */
  repos?: GithubRepoLink[]
}

type GetGithubCardLinkInput = {
  projectId: string
  cardId: string
}

export async function getGithubCardLinkAction({
  projectId,
  cardId,
}: GetGithubCardLinkInput): Promise<ActionOutput<GithubCardLinkResult | null>> {
  try {
    const url = `${process.env.BACKEND_URL}/projects/${projectId}/github/cards/${cardId}/link`
    const data = await FetchClient.get<GithubCardLinkResult>(url)
    return { success: true, data }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      if (error.status === 404) {
        return { success: true, data: null }
      }
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to load GitHub link" }
  }
}
