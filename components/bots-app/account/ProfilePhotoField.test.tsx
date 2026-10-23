import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { resetProfilePhotoOverride } from "lib/attende/profilePhoto"
import { ProfilePhotoField } from "./ProfilePhotoField"
import { UserAvatar } from "./UserAvatar"

const update = jest.fn(async () => null)
let sessionUser: { id: string; name: string; email: string; image: string } = {
  id: "u1",
  name: "Ana Souza",
  email: "ana@x.co",
  image: "",
}

jest.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: sessionUser }, update }) }))
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
jest.mock("actions/users/updateUser", () => ({ updateUserAction: jest.fn() }))
jest.mock("lib/attende/profilePhoto", () => ({
  ...jest.requireActual("lib/attende/profilePhoto"),
  uploadProfilePhoto: jest.fn(),
}))
// The cropper needs a real canvas; the stub hands back a JPEG blob as soon as the dialog opens.
jest.mock("./ProfilePhotoCropDialog", () => ({
  ProfilePhotoCropDialog: ({ src, onSave }: { src: string | null; onSave: (blob: Blob) => void }) =>
    src ? (
      <button type="button" onClick={() => onSave(new Blob(["x"], { type: "image/jpeg" }))}>
        crop-save
      </button>
    ) : null,
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { updateUserAction } = require("actions/users/updateUser") as { updateUserAction: jest.Mock }
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { uploadProfilePhoto } = require("lib/attende/profilePhoto") as { uploadProfilePhoto: jest.Mock }

const fileOf = (type: string, size = 1024) => {
  const file = new File(["x"], `photo.${type.split("/")[1]}`, { type })
  Object.defineProperty(file, "size", { value: size })
  return file
}
const choose = (file: File) => fireEvent.change(screen.getByTestId("profile-photo-input"), { target: { files: [file] } })

describe("ProfilePhotoField", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetProfilePhotoOverride()
    sessionUser = { id: "u1", name: "Ana Souza", email: "ana@x.co", image: "" }
  })

  it("shows initials and an add action when there is no photo", () => {
    render(<ProfilePhotoField />)
    expect(screen.getByRole("img", { name: "Profile photo of Ana Souza" })).toHaveTextContent("AS")
    expect(screen.getByRole("button", { name: "Add photo" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Remove photo" })).not.toBeInTheDocument()
  })

  it("rejects files that are not JPG, PNG or WebP", () => {
    render(<ProfilePhotoField />)
    choose(fileOf("image/gif"))
    expect(screen.getByRole("alert")).toHaveTextContent("Use a JPG, PNG or WebP image.")
    expect(uploadProfilePhoto).not.toHaveBeenCalled()
  })

  it("rejects files over 5 MB", () => {
    render(<ProfilePhotoField />)
    choose(fileOf("image/png", 5 * 1024 * 1024 + 1))
    expect(screen.getByRole("alert")).toHaveTextContent("The photo must be 5 MB or smaller.")
  })

  it("uploads the cropped photo, saves it on the user and refreshes the session", async () => {
    uploadProfilePhoto.mockImplementation(async (_blob: Blob, onProgress?: (n: number) => void) => {
      onProgress?.(50)
      return "https://cdn.example/new.jpg"
    })
    updateUserAction.mockResolvedValue({ success: true, data: {} })
    render(<ProfilePhotoField />)

    choose(fileOf("image/jpeg"))
    fireEvent.click(await screen.findByRole("button", { name: "crop-save" }))

    await waitFor(() => expect(screen.getByText("Photo updated")).toBeInTheDocument())
    expect(updateUserAction).toHaveBeenCalledWith({ image: "https://cdn.example/new.jpg" })
    expect(update).toHaveBeenCalledWith({ image: "https://cdn.example/new.jpg" })
    expect(screen.getByTestId("user-avatar-photo")).toHaveAttribute("src", "https://cdn.example/new.jpg")
    expect(screen.getByRole("button", { name: "Change photo" })).toBeInTheDocument()
  })

  it("accepts a dropped photo", async () => {
    render(<ProfilePhotoField />)
    fireEvent.drop(screen.getByTestId("profile-photo-dropzone"), { dataTransfer: { files: [fileOf("image/webp")] } })
    expect(await screen.findByRole("button", { name: "crop-save" })).toBeInTheDocument()
  })

  it("shows an error and keeps the old photo when saving fails", async () => {
    sessionUser.image = "https://cdn.example/old.jpg"
    uploadProfilePhoto.mockResolvedValue("https://cdn.example/new.jpg")
    updateUserAction.mockResolvedValue({ success: false, error: "nope" })
    render(<ProfilePhotoField />)

    choose(fileOf("image/png"))
    fireEvent.click(await screen.findByRole("button", { name: "crop-save" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't save your photo. Try again.")
    expect(update).not.toHaveBeenCalled()
    expect(screen.getByTestId("user-avatar-photo")).toHaveAttribute("src", "https://cdn.example/old.jpg")
  })

  it("removes the photo and falls back to initials", async () => {
    sessionUser.image = "https://cdn.example/old.jpg"
    updateUserAction.mockResolvedValue({ success: true, data: {} })
    render(<ProfilePhotoField />)

    fireEvent.click(screen.getByRole("button", { name: "Remove photo" }))

    await waitFor(() => expect(screen.getByText("Photo removed")).toBeInTheDocument())
    expect(updateUserAction).toHaveBeenCalledWith({ image: "" })
    expect(screen.queryByTestId("user-avatar-photo")).not.toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Profile photo of Ana Souza" })).toHaveTextContent("AS")
    expect(screen.getByRole("button", { name: "Add photo" })).toBeInTheDocument()
  })
})

describe("UserAvatar", () => {
  it("falls back to initials when the photo fails to load", () => {
    render(<UserAvatar src="https://cdn.example/broken.jpg" initials="AS" />)
    act(() => {
      fireEvent.error(screen.getByTestId("user-avatar-photo"))
    })
    expect(screen.queryByTestId("user-avatar-photo")).not.toBeInTheDocument()
    expect(screen.getByText("AS")).toBeInTheDocument()
  })
})
