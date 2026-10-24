import type { ServiceErrorKey } from "lib/attende/result"
import type { ShellEntry } from "./shellTranslator"

/**
 * Failures of the service itself (see `serviceErrorKey` in lib/attende/result.ts). Spread into every Attende dictionary so
 * each screen can show them with its own translator.
 */
export const serviceErrorEntries = {
  errWorkspaceMismatch: {
    en: "This page was opened for another workspace than the one you are signed in to. Reload the page to continue.",
    pt: "Esta página foi aberta para outro workspace, diferente do que você está usando. Recarregue a página para continuar.",
    es: "Esta página se abrió para otro workspace, distinto del que estás usando. Recarga la página para continuar.",
  },
  errJsynqUnavailable: {
    en: "The service is temporarily unavailable. Wait a moment and try again.",
    pt: "O serviço está indisponível no momento. Aguarde um pouco e tente novamente.",
    es: "El servicio no está disponible en este momento. Espera un poco e inténtalo de nuevo.",
  },
} satisfies Record<ServiceErrorKey, ShellEntry>
