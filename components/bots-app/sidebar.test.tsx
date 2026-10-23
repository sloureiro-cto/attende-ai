import { fireEvent, render, screen } from "@testing-library/react"
import { SidebarToggle } from "./sidebar"

const labels = { collapse: "Collapse menu", expand: "Expand menu" }

afterEach(() => {
  document.documentElement.removeAttribute("data-sidebar")
  localStorage.clear()
})

describe("SidebarToggle", () => {
  it("collapses and expands the menu and remembers the choice", () => {
    render(<SidebarToggle labels={labels} />)
    fireEvent.click(screen.getByRole("button", { name: "Collapse menu" }))
    expect(document.documentElement.getAttribute("data-sidebar")).toBe("collapsed")
    expect(localStorage.getItem("attende-sidebar")).toBe("collapsed")
    fireEvent.click(screen.getByRole("button", { name: "Expand menu" }))
    expect(document.documentElement.hasAttribute("data-sidebar")).toBe(false)
    expect(localStorage.getItem("attende-sidebar")).toBe("expanded")
  })

  it("starts collapsed when the boot script restored it", () => {
    document.documentElement.setAttribute("data-sidebar", "collapsed")
    render(<SidebarToggle labels={labels} />)
    expect(screen.getByRole("button", { name: "Expand menu" })).toHaveAttribute("aria-expanded", "false")
  })
})
