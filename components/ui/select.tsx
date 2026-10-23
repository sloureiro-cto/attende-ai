import * as SelectPrimitive from "@radix-ui/react-select"
import clsx from "clsx"
import React from "react"
import {
  ExclusiveOverlayRoot,
  exclusiveOverlayContentProps,
  exclusiveOverlayTriggerProps,
  useExclusiveOverlayId,
} from "context/ExclusiveOverlayContext"

type SelectRootProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root> & {
  /** Radix Select 2.2.6 has no `modal`; keep the prop so overlay callers typecheck. */
  modal?: boolean
}

const Select = ({ modal: _modal, open, defaultOpen, onOpenChange, ...props }: SelectRootProps) => (
  <ExclusiveOverlayRoot open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
    {(binding) => (
      <SelectPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} {...props} {...binding} />
    )}
  </ExclusiveOverlayRoot>
)

type SelectTriggerProps = React.ComponentProps<typeof SelectPrimitive.Trigger>
type SelectTriggerRef = React.ElementRef<typeof SelectPrimitive.Trigger>

const SelectTrigger = React.forwardRef<SelectTriggerRef, SelectTriggerProps>(
  ({ children, className, ...props }, forwardedRef) => {
    const id = useExclusiveOverlayId()
    return (
      <SelectPrimitive.Trigger
        className={clsx("", className)}
        {...props}
        {...exclusiveOverlayTriggerProps(id)}
        ref={forwardedRef}
      >
        {children}
      </SelectPrimitive.Trigger>
    )
  }
)

SelectTrigger.displayName = "SelectTrigger"

type SelectValueProps = React.ComponentProps<typeof SelectPrimitive.Value>
type SelectValueRef = React.ElementRef<typeof SelectPrimitive.Value>

const SelectValue = React.forwardRef<SelectValueRef, SelectValueProps>(
  ({ children, className, ...props }, forwardedRef) => (
    <SelectPrimitive.Value className={clsx("", className)} {...props} ref={forwardedRef}>
      {children}
    </SelectPrimitive.Value>
  )
)

SelectValue.displayName = "SelectValue"

type SelectIconProps = React.ComponentProps<typeof SelectPrimitive.Icon>
type SelectIconRef = React.ElementRef<typeof SelectPrimitive.Icon>

const SelectIcon = React.forwardRef<SelectIconRef, SelectIconProps>(
  ({ children, className, ...props }, forwardedRef) => (
    <SelectPrimitive.Icon className={clsx("", className)} {...props} ref={forwardedRef}>
      {children}
    </SelectPrimitive.Icon>
  )
)

SelectIcon.displayName = "SelectIcon"

type SelectPortalProps = React.ComponentProps<typeof SelectPrimitive.Portal>

const SelectPortal: React.FC<SelectPortalProps & { className: string }> = ({ children, ...props }) => (
  <SelectPrimitive.Portal {...props}>{children}</SelectPrimitive.Portal>
)

SelectPortal.displayName = "SelectPortal"

type SelectContentProps = React.ComponentProps<typeof SelectPrimitive.Content>
type SelectContentRef = React.ElementRef<typeof SelectPrimitive.Content>

const SelectContent = React.forwardRef<SelectContentRef, SelectContentProps>(
  ({ children, className, ...props }, forwardedRef) => {
    const id = useExclusiveOverlayId()
    return (
      <SelectPrimitive.Content
        className={clsx("", className)}
        {...props}
        {...exclusiveOverlayContentProps(id)}
        ref={forwardedRef}
      >
        {children}
      </SelectPrimitive.Content>
    )
  }
)

SelectContent.displayName = "SelectContent"

type SelectScrollUpButtonProps = React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>
type SelectScrollUpButtonRef = React.ElementRef<typeof SelectPrimitive.ScrollUpButton>

const SelectScrollUpButton = React.forwardRef<SelectScrollUpButtonRef, SelectScrollUpButtonProps>(
  ({ children, className, ...props }, forwardedRef) => (
    <SelectPrimitive.ScrollUpButton className={clsx("", className)} {...props} ref={forwardedRef}>
      {children}
    </SelectPrimitive.ScrollUpButton>
  )
)

SelectScrollUpButton.displayName = "SelectScrollUpButton"

type SelectScrollDownButtonProps = React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>
type SelectScrollDownButtonRef = React.ElementRef<typeof SelectPrimitive.ScrollDownButton>

const SelectScrollDownButton = React.forwardRef<SelectScrollDownButtonRef, SelectScrollDownButtonProps>(
  ({ children, className, ...props }, forwardedRef) => (
    <SelectPrimitive.ScrollDownButton className={clsx("", className)} {...props} ref={forwardedRef}>
      {children}
    </SelectPrimitive.ScrollDownButton>
  )
)

SelectScrollDownButton.displayName = "SelectScrollDownButton"

type SelectViewportProps = React.ComponentProps<typeof SelectPrimitive.Viewport>
type SelectViewportRef = React.ElementRef<typeof SelectPrimitive.Viewport>

const SelectViewport = React.forwardRef<SelectViewportRef, SelectViewportProps>(
  ({ children, className, ...props }, forwardedRef) => (
    <SelectPrimitive.Viewport className={clsx("", className)} {...props} ref={forwardedRef}>
      {children}
    </SelectPrimitive.Viewport>
  )
)

SelectViewport.displayName = "SelectViewport"

type SelectGroupProps = React.ComponentProps<typeof SelectPrimitive.Group>
type SelectGroupRef = React.ElementRef<typeof SelectPrimitive.Group>

const SelectGroup = React.forwardRef<SelectGroupRef, SelectGroupProps>(
  ({ children, className, ...props }, forwardedRef) => (
    <SelectPrimitive.Group className={clsx("", className)} {...props} ref={forwardedRef}>
      {children}
    </SelectPrimitive.Group>
  )
)

SelectGroup.displayName = "SelectGroup"

type SelectItemProps = React.ComponentProps<typeof SelectPrimitive.Item>
type SelectItemRef = React.ElementRef<typeof SelectPrimitive.Item>

const SelectItem = React.forwardRef<SelectItemRef, SelectItemProps & { noBorder?: boolean }>(
  ({ children, className, noBorder, ...props }, forwardedRef) => {
    return (
      <SelectPrimitive.Item
        className={clsx(
          noBorder ? "" : "border-l-3 border-transparent",
          "[&[data-state=checked]]:bg-gray-100",
          className
        )}
        {...props}
        ref={forwardedRef}
      >
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        {/* <SelectPrimitive.ItemIndicator className="bg-blue-500">
          {children}
        </SelectPrimitive.ItemIndicator> */}
      </SelectPrimitive.Item>
    )
  }
)

SelectItem.displayName = "SelectItem"

type SelectSeparatorProps = React.ComponentProps<typeof SelectPrimitive.Separator>
type SelectSeparatorRef = React.ElementRef<typeof SelectPrimitive.Separator>

const SelectSeparator = React.forwardRef<SelectSeparatorRef, SelectSeparatorProps>(
  ({ children, className, ...props }, forwardedRef) => (
    <SelectPrimitive.Separator className={clsx("", className)} {...props} ref={forwardedRef}>
      {children}
    </SelectPrimitive.Separator>
  )
)

SelectSeparator.displayName = "SelectSeparator"

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectIcon,
  SelectItem,
  SelectPortal,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  SelectViewport,
}
