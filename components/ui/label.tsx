import { twMerge } from "tailwind-merge"

const Label: React.FC<{ text?: string; required?: boolean } & React.LabelHTMLAttributes<HTMLLabelElement>> = ({
  text,
  required,
  children,
  ...props
}) => {
  return (
    <label {...props} className={twMerge("mb-1 flex gap-x-1 text-xs font-medium text-gray-500", props.className)}>
      {text || children}
      {required ? <span className="text-red-600">*</span> : null}
    </label>
  )
}

export { Label }
