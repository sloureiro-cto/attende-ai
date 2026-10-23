import { ArrangeHorizontalSquare, ArrowLeft, Edit, Tag, Trash } from "iconsax-react"
import { Check, Plus, X } from "lucide-react"
import { ReactNode, useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { CreateLabelDTO, ILabel } from "app/_types/Label"
import { PermissionsEnum } from "app/_types/Role"
import Button from "components/Button/Button"
import { ConfirmationDialog } from "components/ConfirmationModal/ConfirmationModal"
import { ContrastText } from "components/ContrastText/ContrastText"
import { Divider } from "components/Divider/Divider"
import { SearchOption } from "components/SearchPopover/SearchOption"
import { SearchPopover, SearchPopoverProps } from "components/SearchPopover/SearchPopover"
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
import { useProjects } from "context/ProjectContext"
import { useLabels } from "context/ProjectLabelsContext"
import { useHasPermission } from "hooks/useHasPermissions"
import { useLabelActions } from "hooks/useLabelActions"
import { useProjectsTranslation } from "hooks/useProjectsTranslation"
import { useScopedProjectLabels } from "hooks/useScopedProjectLabels"
import { defaultBoardIdsForNewLabel } from "lib/labels/labelBoardScope"
import { Label } from "../Task/preview/components/Labels"

const colors = [
  //Shade of Gray
  { color: "#040405", label: "Black" },
  { color: "#4D4B5C", label: "Dark Gray" },
  { color: "#BBB9C7", label: "Gray" },

  //Shade of Green
  { color: "#29684C", label: "Dark Green" },
  { color: "#45AD7E", label: "Emerald Green" },
  { color: "#8FCEB2", label: "Light Green" },

  //Shade of Blue
  { color: "#0D59A1", label: "Navy Blue" },
  { color: "#2F8FEB", label: "Blue" },
  { color: "#85C4FF", label: "Light Blue" },

  //Shade of Purple
  { color: "#6F00A3", label: "Violet" },
  { color: "#A542C1", label: "Purple" },
  { color: "#DA9CF7", label: "Lavender" },

  //Shade of Pink
  { color: "#CA045D", label: "Magenta" },
  { color: "#FF3892", label: "Fuchsia" },
  { color: "#FF8CC0", label: "Pink" },

  //Shade of Red
  { color: "#B91C1C", label: "Crimson" },
  { color: "#EF4444", label: "Blaze Red" },
  { color: "#FCA5A5", label: "Salmon Pink" },

  //Shade of Orange
  { color: "#CC611E", label: "Burnt Orange" },
  { color: "#FF7925", label: "Orange" },
  { color: "#FFB587", label: "Creamy Orange" },

  //Shade of Yellow
  { color: "#CA8A04", label: "Gold" },
  { color: "#FFB538", label: "Honey Yellow" },
  { color: "#FFDCA1", label: "Light Yellow" },
]

const patterns = [
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

interface LabelsLayoutProps extends Omit<SearchPopoverProps, "children"> {
  readOnly?: boolean
  selectedLabels?: ILabel[]
  onLabelsChange?: (labels: ILabel[]) => void
  children?: ReactNode
}

const Container = ({ children }: { children: ReactNode }) => {
  const { t } = useProjectsTranslation()
  return (
    <div className="grid w-full min-w-0 grid-cols-12 border-t border-neutral-10">
      <div className="col-span-5 flex min-w-0 items-center gap-[10px] border-r border-neutral-10 px-4 py-[10px]">
        <Tag size={16} className="shrink-0" />
        <span className="min-w-0 break-words text-xs font-semibold text-neutral-900">{t("labelsLabel")}</span>
      </div>
      <div className="col-span-7 min-w-0 overflow-hidden">{children}</div>
    </div>
  )
}

export function LabelsLayout({
  readOnly = false,
  selectedLabels = [],
  onLabelsChange,
  children,
  classNames,
  ...props
}: LabelsLayoutProps) {
  const { t } = useProjectsTranslation()
  const { currentProject } = useProjects()
  const { labels } = useLabels()
  const { pickerLabels, sharingMode, boardId } = useScopedProjectLabels()
  const { createLabel, deleteLabel, updateLabel } = useLabelActions()
  const canReadLabels = useHasPermission(PermissionsEnum.PROJECT_READ_LABEL, "project", currentProject?._id)
  const canCreateLabel = useHasPermission(PermissionsEnum.PROJECT_CREATE_LABEL, "project", currentProject?._id)
  const canUpdateLabel = useHasPermission(PermissionsEnum.PROJECT_UPDATE_LABEL, "project", currentProject?._id)
  const canDeleteLabel = useHasPermission(PermissionsEnum.PROJECT_DELETE_LABEL, "project", currentProject?._id)
  const labelsReadOnly = readOnly || !canUpdateLabel

  const [isEditing, setIsEditing] = useState(false)
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)

  const [isCreating, setIsCreating] = useState(false)
  const [deletingLabelId, setDeletingLabelId] = useState<string | null>(null)
  const [newLabel, setNewLabel] = useState<Partial<ILabel>>({
    text: "",
    color: "",
    pattern: undefined,
  })
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [isColorBlindMode, setIsColorBlindMode] = useState(false)
  const isEditorOpen = step === 1

  const handleSetNewLabel = (label: Partial<ILabel>) => {
    setNewLabel((oldLabel) => ({ ...oldLabel, ...label }))
  }

  const handleOnChange = (values: string[]) => {
    if (!labels || !onLabelsChange) return
    const catalog = labels
    const newState = catalog.filter((label) => values.includes(label._id?.toString() ?? ""))
    onLabelsChange(newState)
  }

  const handleDeleteLabel = async (labelId: string) => {
    if (!canDeleteLabel || !currentProject || deletingLabelId === labelId) return

    setDeletingLabelId(labelId)

    try {
      // Check if the label is attached to the current card
      const isLabelAttached = selectedLabels.some((label) => label._id?.toString() === labelId)

      // Delete the label from the project
      await deleteLabel({ projectId: currentProject?._id.toString(), labelId })

      // If the label was attached to the card, remove it from the card's labels
      if (isLabelAttached && onLabelsChange) {
        const updatedLabels = selectedLabels.filter((label) => label._id?.toString() !== labelId)
        onLabelsChange(updatedLabels)
      }
    } finally {
      setDeletingLabelId(null)
      setIsDeleteDialogOpen(false)
    }
  }

  const handleCreateLabel = async () => {
    if (!canCreateLabel || !newLabel || !currentProject) return
    if (!newLabel.text?.trim()) return

    setIsCreating(true)

    const newProjectLabel = {
      ...newLabel,
      pattern: isColorBlindMode ? newLabel.pattern : undefined,
      project: currentProject._id.toString(),
      boardIds: defaultBoardIdsForNewLabel(sharingMode, boardId),
    } as CreateLabelDTO

    const createdLabel = await createLabel(newProjectLabel)

    // Automatically attach the newly created label to the card if onLabelsChange is provided
    if (createdLabel && onLabelsChange) {
      const updatedLabels = [...selectedLabels, createdLabel]
      onLabelsChange(updatedLabels)
    }

    setIsCreating(false)
    setNewLabel({
      text: "",
      color: "",
    })
  }

  const clearValues = (keepText = false) => {
    setNewLabel({ text: keepText ? newLabel.text ?? "" : "", color: "", pattern: undefined })
    setStep(0)
    setIsEditing(false)
    setEditingLabelId(null)
    setIsColorBlindMode(false)
  }

  const handleUpdateLabel = async () => {
    if (!canUpdateLabel || !editingLabelId || !currentProject) return
    if (!newLabel.text?.trim()) return

    const nextPattern = !isColorBlindMode || newLabel.pattern === undefined ? undefined : newLabel.pattern

    updateLabel({
      labelId: editingLabelId,
      data: {
        ...newLabel,
        pattern: nextPattern === undefined ? null : nextPattern,
      },
    })

    if (onLabelsChange) {
      const isAttached = selectedLabels.some((label) => label._id?.toString() === editingLabelId)
      if (isAttached) {
        onLabelsChange(
          selectedLabels.map((label) =>
            label._id?.toString() === editingLabelId
              ? {
                  ...label,
                  text: newLabel.text ?? label.text,
                  color: newLabel.color ?? label.color,
                  pattern: nextPattern,
                }
              : label
          )
        )
      }
    }

    clearValues()
  }

  const handleEditLabel = () => (labelId: string) => {
    const label = labels?.find((label) => label._id?.toString() === labelId)
    if (!label) return

    setNewLabel({
      text: label.text,
      color: label.color,
      pattern: label.pattern,
    })

    setEditingLabelId(labelId)
    setStep(1)
    setIsEditing(true)

    if (label.pattern) {
      setIsColorBlindMode(true)
    }
  }

  useEffect(() => {
    if (step === 1 && !isEditing) {
      let initialPattern = undefined
      let initialColor = ""
      if (newLabel.color === "") {
        initialColor = colors[0]?.color ?? ""
      }
      if (newLabel.pattern === undefined) {
        initialPattern = 1
      }
      handleSetNewLabel({ color: initialColor, pattern: initialPattern })
    }
  }, [step])

  if (!canReadLabels) {
    return null
  }

  if (labelsReadOnly) {
    return (
      <Container>
        <div className="flex h-fit w-full flex-wrap gap-[10px] px-4 py-[10px]">
          {selectedLabels.length > 0 ? (
            selectedLabels.map((label, index) => (
              <div
                key={`label${index}`}
                className="w-fit max-w-full overflow-hidden truncate rounded px-2 py-1 text-xs font-normal text-white"
                style={{ backgroundColor: label.color }}
              >
                <ContrastText bgColor={label.color}>{label.text}</ContrastText>
              </div>
            ))
          ) : (
            <div className="rounded px-2 py-1 text-xs font-normal text-neutral-500">{t("noLabelsSelected")}</div>
          )}
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <SearchPopover
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            clearValues(false)
          }

          setIsOpen(open)
        }}
        modal={false}
        items={pickerLabels
          .filter((label) => label.text.toLowerCase().includes(newLabel.text?.toLocaleLowerCase() ?? ""))
          .map((label, index) => (
            <SearchOption key={`label${index}`} value={label._id?.toString() ?? ""} className="w-full">
              <LabelsOptions
                label={label}
                handleDeleteLabel={handleDeleteLabel}
                isDeleting={deletingLabelId === label._id?.toString()}
                handleEditLabel={() => handleEditLabel()(label._id?.toString() ?? "")}
              />
            </SearchOption>
          ))}
        emptyContent={
          isEditorOpen ? (
            <LabelEditorPickers
              newLabel={newLabel}
              isColorBlindMode={isColorBlindMode}
              onSelectColor={(color) => handleSetNewLabel({ color })}
              onSelectPattern={(pattern) => handleSetNewLabel({ pattern })}
            />
          ) : (
            <EmptyContent newLabel={newLabel} isCreating={isCreating} onCreate={() => setStep(1)} />
          )
        }
        subHeaderFirst={isEditorOpen}
        subHeaderComponent={
          isEditorOpen ? (
            <LabelEditorHeader
              newLabel={newLabel}
              isColorBlindMode={isColorBlindMode}
              onBack={() => setStep(0)}
              onClose={() => {
                clearValues(false)
                setIsOpen(false)
              }}
              onTextChange={(text) => handleSetNewLabel({ text })}
            />
          ) : undefined
        }
        footerComponent={
          isEditorOpen ? (
            <LabelEditorActions
              newLabel={newLabel}
              isCreating={isCreating}
              isEditing={isEditing}
              isColorBlindMode={isColorBlindMode}
              onToggleColorBlindMode={() => setIsColorBlindMode(!isColorBlindMode)}
              onSubmit={() => {
                if (isEditing) {
                  handleUpdateLabel()
                } else {
                  handleCreateLabel()
                }
                setStep(0)
              }}
            />
          ) : undefined
        }
        inputPlaceholder={t("searchOrCreateLabel")}
        searchValue={newLabel.text ?? ""}
        setSearchValue={(value) => handleSetNewLabel({ text: value })}
        debounceTime={500}
        value={selectedLabels.map((label) => label?._id ?? "").filter(Boolean)}
        onChange={(value) => handleOnChange(value as string[])}
        onEnter={(value) => {
          const exactMatch = pickerLabels.find((label) => label.text.toLowerCase() === value.toLowerCase())
          if (exactMatch?._id) {
            handleOnChange(
              Array.from(
                new Set([...selectedLabels.map((label) => label._id?.toString() ?? ""), exactMatch._id.toString()])
              )
            )
            return
          }

          if (!canCreateLabel) return
          setStep(1)
        }}
        classNames={{
          ...classNames,
          content: cn(
            classNames?.content,
            isEditorOpen &&
              cn(
                "!w-[min(22.5rem,calc(100vw-1.5rem))] !max-h-[min(32rem,calc(100dvh-1.5rem))] overflow-hidden !overflow-y-hidden",
                "!fixed !left-1/2 !top-1/2 !z-[70] !-translate-x-1/2 !-translate-y-1/2"
              )
          ),
          container: cn(
            "min-w-[256px] max-w-[300px] overflow-y-auto max-h-[320px] md:max-h-[460px]",
            classNames?.container,
            isEditorOpen &&
              "min-h-0 min-w-0 w-full max-h-[min(32rem,calc(100dvh-1.5rem))] max-w-none overflow-hidden !overflow-y-hidden"
          ),
          itemsContainer: cn(classNames?.itemsContainer, isEditorOpen && "min-h-0 p-0 pt-0"),
        }}
        multipleSelect
        showSearchInput={step === 0 && !isEditing}
        removePortal
        keepEmptyContent={isEditorOpen}
        {...props}
      >
        {children || (
          <button
            className={cn(
              "h-fit max-h-[284px] w-full justify-start overflow-y-auto rounded-none border-none px-4 py-[10px] text-left transition-all hover:bg-neutral-10"
            )}
          >
            <div className="flex w-full flex-wrap gap-[10px]">
              {selectedLabels.length > 0 ? (
                selectedLabels.map((label, index) => <Label key={`label${index}`} label={label} variant="card" />)
              ) : (
                <div className="rounded px-2 py-1 text-xs font-normal text-neutral-500">{t("noLabelsSelected")}</div>
              )}
            </div>
          </button>
        )}
      </SearchPopover>
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => handleDeleteLabel(newLabel._id?.toString() ?? "")}
        title={t("removeLabel")}
        description={t("removeLabelConfirmation")}
        confirmText={t("remove")}
        cancelText={t("cancel")}
      />
    </Container>
  )
}

function EmptyContent({
  newLabel,
  isCreating,
  onCreate,
}: {
  newLabel: Partial<ILabel>
  isCreating: boolean
  onCreate: () => void
}) {
  const { t } = useProjectsTranslation()

  return (
    <div className="flex w-full flex-col px-2 pb-2">
      <Button
        variant="secondary"
        size="small"
        className="flex w-full items-center justify-center gap-1 text-body-12 font-semibold text-secondary-darkest"
        onClick={onCreate}
        loading={isCreating}
        disabled={!newLabel?.text?.trim()}
        startIcon={<Plus size={14} className="shrink-0" />}
      >
        <p className="line-clamp-2">
          {t("createNewLabel")} <span className="font-normal text-secondary">{`"${newLabel.text}"`}</span>
        </p>
      </Button>
    </div>
  )
}

export function LabelEditorHeader({
  newLabel,
  isColorBlindMode,
  onBack,
  onClose,
  onTextChange,
}: {
  newLabel: Partial<ILabel>
  isColorBlindMode: boolean
  onBack: () => void
  onClose: () => void
  onTextChange: (text: string) => void
}) {
  const { t } = useProjectsTranslation()

  return (
    <div className="flex shrink-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-2 py-1">
        <button
          type="button"
          onClick={onBack}
          className="flex size-9 items-center justify-center rounded-md hover:bg-neutral-10"
        >
          <ArrowLeft size={18} className="text-neutral-500" />
        </button>

        <span className="text-body-14 font-bold text-neutral-900">{t("labelsLabel")}</span>

        <button
          type="button"
          onClick={onClose}
          className="flex size-9 items-center justify-center rounded-md hover:bg-neutral-10"
          aria-label={t("close")}
        >
          <X size={18} className="text-neutral-500" />
        </button>
      </div>
      <Divider />
      <div className="w-full p-3">
        <LabelPreview
          label={newLabel}
          isColorBlindMode={isColorBlindMode}
          onTextChange={onTextChange}
          placeholder={t("labelPlaceholder")}
        />
      </div>
    </div>
  )
}

export function LabelEditorPickers({
  newLabel,
  isColorBlindMode,
  onSelectColor,
  onSelectPattern,
}: {
  newLabel: Partial<ILabel>
  isColorBlindMode: boolean
  onSelectColor: (color: string) => void
  onSelectPattern: (pattern: number) => void
}) {
  const { t } = useProjectsTranslation()

  return (
    <div className="flex w-full flex-col p-3">
      <div className="text-body-12 font-normal text-neutral-200">{t("pickAColor")}</div>
      <div className="mt-2 grid w-full grid-cols-6 gap-2">
        {colors.map((colorOption, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelectColor(colorOption.color)}
            title={colorOption.label}
            aria-label={colorOption.label}
            aria-pressed={newLabel.color === colorOption.color}
            style={{ backgroundColor: colorOption.color }}
            className="min-h-10 touch-manipulation rounded-md"
          >
            <ContrastText>
              <Check
                size={16}
                className={cn(
                  "mx-auto text-white opacity-0 transition-all",
                  newLabel.color === colorOption.color && "opacity-100"
                )}
              />
            </ContrastText>
          </button>
        ))}
      </div>
      {isColorBlindMode && (
        <>
          <div className="mt-3 text-body-12 font-normal text-neutral-200">{t("pickAPattern")}</div>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {patterns.map((pattern, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onSelectPattern(index + 1)}
                title={t("patternTitle", { number: index + 1 })}
                aria-pressed={newLabel.pattern === index + 1}
                className={cn(
                  "flex min-h-10 touch-manipulation items-center justify-center rounded-md border border-neutral-10 px-1 text-secondary-darkest transition-all hover:bg-neutral-10 active:bg-neutral-10",
                  newLabel.pattern === index + 1 &&
                    "border-primary bg-primary-clean hover:bg-primary-lighter active:bg-primary-lighter"
                )}
              >
                {pattern}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function LabelEditorActions({
  newLabel,
  isCreating,
  isEditing,
  isColorBlindMode,
  onToggleColorBlindMode,
  onSubmit,
}: {
  newLabel: Partial<ILabel>
  isCreating: boolean
  isEditing: boolean
  isColorBlindMode: boolean
  onToggleColorBlindMode: () => void
  onSubmit: () => void
}) {
  const { t } = useProjectsTranslation()

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-neutral-10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <Button
        variant="secondary"
        size="small"
        className="flex min-h-10 w-full shrink items-center justify-center gap-1 whitespace-normal bg-transparent text-body-12 font-semibold text-secondary-darkest"
        onClick={onToggleColorBlindMode}
      >
        {isColorBlindMode ? t("turnOffColorBlindnessMode") : t("turnOnColorBlindnessMode")}
      </Button>
      <Button
        variant="secondary"
        size="small"
        className="flex min-h-10 w-full items-center justify-center gap-1 text-body-12 font-semibold text-secondary-darkest"
        onClick={onSubmit}
        loading={isCreating}
        disabled={!newLabel?.text?.trim() || newLabel.color === ""}
        startIcon={
          isEditing ? (
            <ArrangeHorizontalSquare size={14} className="shrink-0" />
          ) : (
            <Plus size={14} className="shrink-0" />
          )
        }
      >
        <p className="line-clamp-2">
          {isEditing ? t("updateLabel") : t("createNewLabel")}{" "}
          <span className="font-normal text-secondary">{`"${newLabel.text}"`}</span>
        </p>
      </Button>
    </div>
  )
}

const MIN_INPUT_WIDTH_CH = 2

const LabelPreview = ({
  label,
  isColorBlindMode,
  onTextChange,
  placeholder = "Label",
}: {
  label: Partial<ILabel>
  isColorBlindMode: boolean
  onTextChange?: (text: string) => void
  placeholder?: string
}) => {
  const value = label.text ?? ""

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTextChange?.(e.target.value)
  }

  const patternIndex = typeof label.pattern === "number" ? Math.min(10, Math.max(1, label.pattern)) - 1 : undefined
  const showPattern = isColorBlindMode && patternIndex !== undefined

  return (
    <ContrastText
      bgColor={label.color}
      className={cn(
        "flex min-h-10 w-full items-center gap-1 overflow-x-hidden rounded-md px-3 py-2 text-sm font-normal",
        !label.color && "border border-neutral-10"
      )}
      style={{ backgroundColor: label.color || undefined }}
    >
      {showPattern && <span className="flex shrink-0 items-center [&>svg]:size-[18px]">{patterns[patternIndex]}</span>}
      <span className="relative min-w-[2ch] flex-1">
        <span
          aria-hidden
          className="invisible inline-block max-w-full whitespace-pre text-sm font-normal"
          style={{ minWidth: `${MIN_INPUT_WIDTH_CH}ch` }}
        >
          {value || "\u00A0"}
        </span>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          className="absolute inset-0 w-full border-none bg-transparent p-0 text-inherit outline-none placeholder:text-inherit placeholder:opacity-60"
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
        />
      </span>
    </ContrastText>
  )
}

export function LabelsOptions({
  label,
  handleDeleteLabel,
  handleRemoveLabel,
  variation = "default",
  isDeleting = false,
  handleEditLabel,
  hideButtons = false,
}: {
  label: ILabel
  handleDeleteLabel?: (labelId: string) => void
  handleRemoveLabel?: (label: string) => void
  handleEditLabel?: () => void
  variation?: "default" | "compact"
  isDeleting?: boolean
  hideButtons?: boolean
}) {
  const { t } = useProjectsTranslation()
  return (
    <div className="group flex w-full items-center justify-between">
      <div
        className={cn(
          "tems-center flex min-h-[22px] w-fit gap-2 rounded px-2 text-xs font-normal text-white  ",
          variation === "compact" && "px-1 py-0.5"
        )}
        style={{ backgroundColor: label.color }}
      >
        <ContrastText bgColor={label.color} className="line-clamp-2 flex items-center gap-1 text-start">
          {label.pattern && <span className="shrink-0 [&>svg]:size-[18px]">{patterns[label.pattern - 1]}</span>}
          {label.text}
        </ContrastText>
        {handleRemoveLabel && (
          <div
            className="flex cursor-pointer items-center justify-center"
            onClick={() => handleRemoveLabel?.(label._id?.toString() ?? "")}
          >
            <X size={14} className="text-white" />
          </div>
        )}
      </div>

      {!hideButtons && (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (!isDeleting) {
                handleDeleteLabel?.(label._id?.toString() ?? "")
              }
            }}
            disabled={isDeleting}
            className={cn(
              "aspect-square rounded-full border-none bg-transparent p-1 hover:bg-neutral-100/50",
              "opacity-0 transition-all group-hover:pointer-events-auto group-hover:opacity-100",
              !handleDeleteLabel && "hidden",
              isDeleting && "cursor-not-allowed opacity-50"
            )}
            title={t("deleteLabel")}
          >
            <Trash size={14} className={cn("text-error", isDeleting && "animate-pulse")} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              if (!isDeleting) {
                handleEditLabel?.()
              }
            }}
            disabled={isDeleting}
            className={cn(
              "aspect-square rounded-full border-none bg-transparent p-1 hover:bg-neutral-100/50",
              "opacity-0 transition-all group-hover:pointer-events-auto group-hover:opacity-100",
              !handleDeleteLabel && "hidden",
              isDeleting && "cursor-not-allowed opacity-50"
            )}
            title={t("editLabel")}
          >
            <Edit size={14} className={cn("text-neutral-100")} />
          </button>
        </div>
      )}
    </div>
  )
}

function LabelsSkeleton() {
  return (
    <Container>
      <div className="px-4 py-[10px]">
        <Skeleton className="min-h-4 w-[85%] max-w-24 rounded-full" />
      </div>
    </Container>
  )
}

LabelsLayout.displayName = "LabelsLayout"
LabelsLayout.Skeleton = LabelsSkeleton
