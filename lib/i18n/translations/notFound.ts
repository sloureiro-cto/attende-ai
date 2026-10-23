export const notFoundTranslations = {
  english: {
    notFound: {
      title: "Page Not Found",
      description: "The page you're looking for doesn't exist or has been moved.",
      goHome: "Go Home",
      goBack: "Go Back",
    },
  },
  portuguese: {
    notFound: {
      title: "Página não encontrada",
      description: "A página que você está procurando não existe ou foi movida.",
      goHome: "Ir para o início",
      goBack: "Voltar",
    },
  },
  spanish: {
    notFound: {
      title: "Página no encontrada",
      description: "La página que buscas no existe o ha sido movida.",
      goHome: "Ir al inicio",
      goBack: "Volver",
    },
  },
} as const

export type NotFoundTranslationKey = keyof typeof notFoundTranslations.english.notFound
