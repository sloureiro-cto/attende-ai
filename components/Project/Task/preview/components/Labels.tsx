import { Tag } from "iconsax-react"
import { useCallback, useMemo } from "react"
import { ILabel } from "app/_types/Label"
import { ContrastText } from "components/ContrastText/ContrastText"
import {
  Pattern1,
  Pattern10,
  Pattern2,
  Pattern3,
  Pattern4,
  Pattern5,
  Pattern6,
  Pattern7,
  Pattern8,
  Pattern9,
} from "components/SVGS"
import { Tooltip, TooltipContent, TooltipTrigger } from "components/ui/tooltip"
import { useLabels } from "context/ProjectLabelsContext"

interface LabelProps {
  label: ILabel
  variant?: "list" | "card"
}

interface LabelsProps {
  labels: string[] | ILabel[]
  limit?: number
  variant?: "list" | "card"
  cardName?: string
}

interface RemainingLabelsProps {
  remaining: ILabel[]
  variant: "list" | "card"
}

export const patterns = [
  <Pattern1 key="pattern1" size={18} />,
  <Pattern2 key="pattern2" size={18} />,
  <Pattern3 key="pattern3" size={18} />,
  <Pattern4 key="pattern4" size={18} />,
  <Pattern5 key="pattern5" size={18} />,
  <Pattern6 key="pattern6" size={18} />,
  <Pattern7 key="pattern7" size={18} />,
  <Pattern8 key="pattern8" size={18} />,
  <Pattern9 key="pattern9" size={18} />,
  <Pattern10 key="pattern10" size={18} />,
]

const RemainingLabels = ({ remaining, variant }: RemainingLabelsProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="rounded-[4px] border border-neutral-50 px-2 py-1 text-body-12 font-normal">
          <ContrastText className="flex items-center gap-1">
            {`+${remaining.length}`}
            <Tag size={14} />
          </ContrastText>
        </div>
      </TooltipTrigger>
      <TooltipContent align="start">
        <div className="flex flex-col gap-2 rounded-md border border-neutral-50 bg-white p-2">
          {remaining.map((label) => (
            <Label key={label._id?.toString()} label={label} variant={variant} />
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

const Label = ({ label }: LabelProps) => {
  return (
    <div
      className="my-auto flex size-fit h-[22px] max-w-[120px] items-center truncate rounded-[4px] px-2 py-1 text-body-10 font-normal"
      style={{
        backgroundColor: label.color,
      }}
      title={label.text}
    >
      <ContrastText
        bgColor={label.color}
        className={"flex w-fit max-w-[120px] items-center gap-1 truncate text-nowrap"}
      >
        {label.pattern && <span className="shrink-0 [&>svg]:size-[18px]">{patterns[label.pattern - 1]}</span>}
        {label.text}
      </ContrastText>
    </div>
  )
}

const Labels = ({ labels, limit = 3, variant = "card" }: LabelsProps) => {
  const { labels: contextLabels } = useLabels()

  const getLabel = useCallback(
    (labelOrId: string | ILabel) => {
      const id = typeof labelOrId === "string" ? labelOrId : labelOrId._id?.toString()
      const fromContext = contextLabels?.find((label) => label._id?.toString() === id)
      if (fromContext) return fromContext
      return typeof labelOrId === "string" ? undefined : labelOrId
    },
    [contextLabels]
  )

  const labelsToShow = useMemo(() => {
    return labels.map(getLabel).slice(0, limit)
  }, [labels, getLabel, limit])

  const remaining = useMemo(() => {
    return labels
      .map(getLabel)
      .slice(limit)
      .filter((label): label is ILabel => label !== undefined)
  }, [labels, getLabel, limit])

  return (
    <>
      {labelsToShow.map((label, index) => {
        if (label) {
          return <Label key={label._id?.toString() ?? index} label={label} variant={variant} />
        }

        return null
      })}
      {remaining.length > 0 && <RemainingLabels remaining={remaining as ILabel[]} variant={variant} />}
    </>
  )
}

RemainingLabels.displayName = "RemainingLabels"
Label.displayName = "Label"
Labels.displayName = "Labels"

Labels.RemainingLabels = RemainingLabels
Labels.Label = Label

export { Labels, Label }
