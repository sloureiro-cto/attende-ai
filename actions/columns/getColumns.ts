"use server"

import { ActionOutput } from "app/_types/Action"
import { IColumn } from "app/_types/Column"
import { FetchClient, HttpError } from "lib/api"

type GetColumnsInput = {
  projectId: string
  boardId: string
  workspaceOwner?: string
}

type GetColumnsResponse = {
  status: boolean
  columns: IColumn[]
}

export async function getColumnsAction({
  projectId,
  boardId,
  workspaceOwner,
}: GetColumnsInput): Promise<ActionOutput<IColumn[]>> {
  if (!projectId || projectId === "undefined" || !boardId || boardId === "undefined") {
    return { success: false, error: "missing project or board id" }
  }

  try {
    const data = await FetchClient.get<GetColumnsResponse>(
      `${process.env.BACKEND_URL}/projects/${projectId}/boards/${boardId}/columns`,
      { query: { workspaceOwner }, cache: "no-store" }
    )

    return {
      success: true,
      data: data.columns,
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }

    return {
      success: false,
      error: "error fetching columns",
    }
  }
}
