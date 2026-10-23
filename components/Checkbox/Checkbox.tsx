import { CheckboxProps } from "@radix-ui/react-checkbox"
import { cn } from "@/lib/utils"
import { Checkbox as CheckBoxUI } from "components/ui/checkbox"

interface PropsType extends CheckboxProps {
  size?: "small" | "medium" | "large"
  checkedIconClassName?: string
}

export const Checkbox = ({ size = "medium", checkedIconClassName, className, ...props }: PropsType) => {
  const sizes = {
    small: {
      icon: "size-[6px]",
      container: "rounded-sm size-[12px]",
    },
    medium: {
      icon: "size-[10px]",
      container: "rounded size-[20px]",
    },
    large: {
      icon: "size-[18px]",
      container: "rounded-[6px] size-[28px]",
    },
  }

  return (
    <CheckBoxUI
      {...props}
      className={cn(sizes[size].container, className)}
      checkIconClassName={cn(sizes[size].icon, checkedIconClassName)}
    />
  )
}
