"use server"

import { revalidatePath } from "next/cache"
import { ActionOutput } from "app/_types/Action"
import { CreateLabelDTO, ILabel } from "app/_types/Label"
import { FetchClient, HttpError } from "lib/api"

type CreateLabelResponse = {
  status: boolean
  label: ILabel
  error?: boolean
  code?: number
  message?: string
}

const defaultErrorMessage = "Something went wrong while trying to create the label."

export async function createLabelAction({ project, ...payload }: CreateLabelDTO): Promise<ActionOutput<ILabel>> {
  try {
    const data = await FetchClient.post<CreateLabelResponse>(
      `${process.env.BACKEND_URL}/projects/${project}/label`,
      payload
    )

    revalidatePath("/projects", "layout")

    return {
      success: true,
      data: data.label,
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }

    return {
      success: false,
      error: defaultErrorMessage,
    }
  }
}
