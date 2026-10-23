"use client"

import Link from "next/link"
import { useNotFoundTranslation } from "hooks/useNotFoundTranslation"

export default function NotFound() {
  const { t } = useNotFoundTranslation()

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="size-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        </div>
        <h1 className="mb-4 text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mb-6 text-gray-600">{t("description")}</p>
        <div className="flex w-full items-center gap-4">
          <Link
            href="/"
            className="w-full rounded-md bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/90"
          >
            {t("goHome")}
          </Link>
          <button
            // onClick={() => window.history.back()}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
          >
            {t("goBack")}
          </button>
        </div>
      </div>
    </div>
  )
}
