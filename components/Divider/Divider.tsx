import { HTMLProps } from "react"
import { cn } from "@/lib/utils"

interface DividerProps extends Omit<HTMLProps<HTMLDivElement>, "children"> {
  text?: string
  classNames?: {
    text?: string
    container?: string
    line?: string
  }
}

const Line = ({ className }: { className?: string }) => (
  <div className={cn("h-[1px] w-full bg-neutral-50", className)} />
)

export function Divider({ text, className, classNames, ...props }: DividerProps) {
  if (!!text) {
    return (
      <div {...props} className={cn("flex w-full items-center gap-1", classNames?.container)}>
        <Line className={cn(className, classNames?.line)} />
        <span className={cn("text-body-12 font-normal text-neutral-100", classNames?.text)}>{text}</span>
        <Line className={cn(className, classNames?.line)} />
      </div>
    )
  }

  return <Line {...props} className={cn(className, classNames?.line)} />
}

Divider.displayName = "Divider"
