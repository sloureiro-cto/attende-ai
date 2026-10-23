"use server"

import { ActionOutput } from "app/_types/Action"
import { IProject } from "app/_types/Project"
import { FetchClient, HttpError } from "lib/api"
import { isMongoObjectId } from "lib/isMongoObjectId"
import { resolveSessionWorkspaceOwner } from "lib/sessionWorkspace"

type GetProjectInput = {
  idOrSlug: string
  workspaceOwner?: string
}

type GetProjectResponse = {
  status: boolean
  project: IProject
}

export async function getProjectAction({ idOrSlug, workspaceOwner }: GetProjectInput): Promise<ActionOutput<IProject>> {
  // ObjectIds are globally unique. Sending a stale session `workspaceOwner`
  // makes CheckWorkspaceAccess 403 before GetProject runs — the UI then
  // shows "project does not exist". Slugs still need a workspace.
  const resolvedWorkspaceOwner =
    isMongoObjectId(idOrSlug) && !workspaceOwner?.trim()
      ? undefined
      : await resolveSessionWorkspaceOwner(workspaceOwner)

  try {
    const data = await FetchClient.get<GetProjectResponse>(`${process.env.BACKEND_URL}/projects/${idOrSlug}`, {
      query: { workspaceOwner: resolvedWorkspaceOwner },
      cache: "no-store",
    })

    return {
      success: true,
      data: data.project,
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      console.error("[getProjectAction]", {
        idOrSlug,
        status: error.status,
        message: error.message,
      })
      return {
        success: false,
        error: error.message,
      }
    }

    console.error("[getProjectAction]", { idOrSlug, error })
    return {
      success: false,
      error: "something went wrong fetching project",
    }
  }
}
