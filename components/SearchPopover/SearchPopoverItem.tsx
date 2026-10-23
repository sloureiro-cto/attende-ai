import { Check } from "lucide-react"
import { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PropsType {
  value: string
  children?: ReactNode
  selected?: boolean
  onClick: (value: string) => void
  style?: CSSProperties
  classNames?: {
    container?: string
    icon?: string
    content?: string
  }
}

export function SearchPopoverItem({ value, children, selected, onClick, style, classNames }: PropsType) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick(value)
      }}
      style={style}
      className={cn(
        "group flex h-auto w-full min-w-0 shrink-0 flex-nowrap items-center justify-start gap-[10px] overflow-x-hidden rounded-none p-2 text-left outline-none transition-all hover:cursor-pointer hover:bg-neutral-10 focus:outline-none",
        selected && "bg-primary-clean",
        classNames?.container
      )}
      data-selected-value={selected}
    >
      <div className={cn("w-full min-w-0 flex-1 overflow-x-hidden", classNames?.content)}>{children}</div>
      <Check
        className={cn(
          "size-[14px] shrink-0 text-success transition-all duration-300 group-data-[selected-value=false]:opacity-0 group-data-[selected-value=true]:opacity-100",
          classNames?.icon
        )}
      />
    </button>
  )
}

SearchPopoverItem.displayName = "SearchPopoverItem"
