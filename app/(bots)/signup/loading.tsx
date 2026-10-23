import { Skeleton } from "components/ui/skeleton"

export default function SignupLoading() {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]" aria-busy="true">
      <section className="flex flex-col items-center justify-center gap-4 px-5 py-10 sm:px-10">
        <div className="flex w-full max-w-[440px] flex-col gap-4">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </section>
      <aside className="hidden bg-neutral-900 lg:block" />
    </main>
  )
}
