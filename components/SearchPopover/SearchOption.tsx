interface PropsType extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export function SearchOption({ value, children, ...props }: PropsType) {
  return (
    <div data-search-value={value} {...props}>
      {children}
    </div>
  )
}

SearchOption.displayName = "SearchOption"
