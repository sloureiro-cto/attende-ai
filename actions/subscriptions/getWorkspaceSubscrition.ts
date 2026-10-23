"use server"

import { ActionOutput } from "app/_types/Action"
import { ISubscription } from "app/_types/Subscription"
import { FetchClient, HttpError } from "lib/api"

type getWorkspaceSubscriptionResponse = {
  subscription: ISubscription
}

const defaultErrorMessage = "Something went wrong while trying to fetch the subscription."

export async function getWorkspaceSubscription(): Promise<ActionOutput<ISubscription>> {
  try {
    const data = await FetchClient.get<getWorkspaceSubscriptionResponse>(`${process.env.BACKEND_URL}/subscriptions/me`)

    return {
      success: true,
      data: data.subscription,
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
