export type BotsTheme = "light" | "dark"

export const THEME_STORAGE_KEY = "attende-theme"
export const SIDEBAR_STORAGE_KEY = "attende-sidebar"

/**
 * Runs in <head> before the first paint (inlined by the root layout), so a dark page never flashes white:
 * the saved choice wins, else the system preference. It also restores a collapsed side menu, so the layout
 * never jumps after load. The `dark` class turns on Tailwind's `dark:` variants
 * that shared primitives already ship. Kept out of the client module so the server layout
 * imports a plain string.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}var r=document.documentElement;r.setAttribute("data-theme",t);r.classList.toggle("dark",t==="dark");if(localStorage.getItem("${SIDEBAR_STORAGE_KEY}")==="collapsed")r.setAttribute("data-sidebar","collapsed")}catch(e){}})()`
