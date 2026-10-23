import type { ShellEntry } from "./shellTranslator"

/** Public signup: account, e-mail code, card and trial start. Error entries are keyed by the backend `reference`. */
export const signupEntries = {
  signupTitle: { en: "Create your {brand} account", pt: "Crie a sua conta {brand}", es: "Crea tu cuenta {brand}" },
  signupSubtitle: {
    en: "Start your 7-day free trial. Your AI assistant can be answering customers today.",
    pt: "Comece o teste grátis de 7 dias. O seu assistente de IA pode estar atendendo clientes hoje.",
    es: "Empieza la prueba gratis de 7 días. Tu asistente de IA puede estar atendiendo clientes hoy.",
  },
  signupStepAccount: { en: "Account", pt: "Conta", es: "Cuenta" },
  signupStepVerify: { en: "Verify e-mail", pt: "Verificar e-mail", es: "Verificar e-mail" },
  signupStepCard: { en: "Card", pt: "Cartão", es: "Tarjeta" },
  signupStepsAria: { en: "Signup progress", pt: "Progresso do cadastro", es: "Progreso del registro" },
  signupName: { en: "Your name", pt: "O seu nome", es: "Tu nombre" },
  signupEmail: { en: "Work e-mail", pt: "E-mail de trabalho", es: "E-mail de trabajo" },
  signupPassword: { en: "Password", pt: "Senha", es: "Contraseña" },
  signupPasswordHint: {
    en: "At least 6 characters, with a number and a special character.",
    pt: "No mínimo 6 caracteres, com um número e um caractere especial.",
    es: "Mínimo 6 caracteres, con un número y un carácter especial.",
  },
  signupBusiness: { en: "Business name", pt: "Nome da empresa", es: "Nombre de la empresa" },
  signupPlan: { en: "Plan", pt: "Plano", es: "Plan" },
  signupPlanStarter: { en: "Starter", pt: "Starter", es: "Starter" },
  signupPlanGrowth: { en: "Growth", pt: "Growth", es: "Growth" },
  signupPlanScale: { en: "Scale", pt: "Scale", es: "Scale" },
  signupPlanPrice: { en: "{price} / {interval}", pt: "{price} / {interval}", es: "{price} / {interval}" },
  signupIntervalMonth: { en: "month", pt: "mês", es: "mes" },
  signupTerms: {
    en: "I agree to the terms of use and the privacy policy.",
    pt: "Concordo com os termos de uso e a política de privacidade.",
    es: "Acepto los términos de uso y la política de privacidad.",
  },
  signupTermsRequired: { en: "Accept the terms to continue.", pt: "Aceite os termos para continuar.", es: "Acepta los términos para continuar." },
  signupSubmit: { en: "Continue", pt: "Continuar", es: "Continuar" },
  signupHaveAccount: { en: "Already have an account?", pt: "Já tem uma conta?", es: "¿Ya tienes una cuenta?" },
  signupSignIn: { en: "Sign in", pt: "Entrar", es: "Iniciar sesión" },
  signupFieldRequired: { en: "Fill in this field.", pt: "Preencha este campo.", es: "Completa este campo." },
  signupEmailInvalid: { en: "Enter a valid e-mail.", pt: "Informe um e-mail válido.", es: "Introduce un e-mail válido." },
  signupPasswordInvalid: {
    en: "The password needs 6+ characters, a number and a special character.",
    pt: "A senha precisa de 6+ caracteres, um número e um caractere especial.",
    es: "La contraseña necesita 6+ caracteres, un número y un carácter especial.",
  },

  otpTitle: { en: "Check your e-mail", pt: "Verifique o seu e-mail", es: "Revisa tu e-mail" },
  otpChangeEmail: { en: "Use another e-mail", pt: "Usar outro e-mail", es: "Usar otro e-mail" },
  otpSignInFailed: {
    en: "Your e-mail is verified, but we could not sign you in. Sign in to continue.",
    pt: "O seu e-mail foi verificado, mas não conseguimos entrar na conta. Entre para continuar.",
    es: "Tu e-mail fue verificado, pero no pudimos iniciar sesión. Inicia sesión para continuar.",
  },

  cardTitle: { en: "Add a card to start your trial", pt: "Adicione um cartão para começar o teste", es: "Añade una tarjeta para empezar la prueba" },
  cardSubtitle: {
    en: "You will not be charged today.",
    pt: "Você não será cobrado hoje.",
    es: "No se te cobrará hoy.",
  },
  cardTrialDays: { en: "{days} days free", pt: "{days} dias grátis", es: "{days} días gratis" },
  cardThenPrice: {
    en: "Then {price} per {interval}. Cancel anytime.",
    pt: "Depois {price} por {interval}. Cancele quando quiser.",
    es: "Después {price} por {interval}. Cancela cuando quieras.",
  },
  cardThenPending: {
    en: "Then the price of your plan. Cancel anytime.",
    pt: "Depois o valor do seu plano. Cancele quando quiser.",
    es: "Después el precio de tu plan. Cancela cuando quieras.",
  },
  cardCap: {
    en: "During the trial you can send up to {count} messages.",
    pt: "Durante o teste você pode enviar até {count} mensagens.",
    es: "Durante la prueba puedes enviar hasta {count} mensajes.",
  },
  cardSecure: { en: "Card details are handled by Stripe.", pt: "Os dados do cartão são tratados pela Stripe.", es: "Los datos de la tarjeta los gestiona Stripe." },
  cardSubmit: { en: "Start free trial", pt: "Começar teste grátis", es: "Empezar prueba gratis" },
  cardPreparing: { en: "Preparing the secure form…", pt: "Preparando o formulário seguro…", es: "Preparando el formulario seguro…" },
  cardLoadFailed: {
    en: "We could not load the card form.",
    pt: "Não foi possível carregar o formulário do cartão.",
    es: "No pudimos cargar el formulario de la tarjeta.",
  },
  cardRetry: { en: "Try again", pt: "Tentar novamente", es: "Intentar de nuevo" },
  cardStripeMissing: {
    en: "Payments are not configured in this environment.",
    pt: "Os pagamentos não estão configurados neste ambiente.",
    es: "Los pagos no están configurados en este entorno.",
  },
  cardFinishing: { en: "Starting your trial…", pt: "Iniciando o seu teste…", es: "Iniciando tu prueba…" },
  cardRetryHint: {
    en: "Your account is safe. Try another card or try again.",
    pt: "A sua conta está segura. Tente outro cartão ou tente novamente.",
    es: "Tu cuenta está segura. Prueba otra tarjeta o inténtalo de nuevo.",
  },

  errSIGNUP_INVALID_BODY: {
    en: "Some of the information is not valid. Check the fields and try again.",
    pt: "Algumas informações não são válidas. Confira os campos e tente novamente.",
    es: "Algunos datos no son válidos. Revisa los campos e inténtalo de nuevo.",
  },
  errSIGNUP_DISPOSABLE_EMAIL: {
    en: "Temporary e-mail addresses are not accepted. Use your work e-mail.",
    pt: "E-mails temporários não são aceitos. Use o seu e-mail de trabalho.",
    es: "No se aceptan e-mails temporales. Usa tu e-mail de trabajo.",
  },
  errSIGNUP_PASSWORD_CONTAINS_NAME: {
    en: "The password cannot contain your name.",
    pt: "A senha não pode conter o seu nome.",
    es: "La contraseña no puede contener tu nombre.",
  },
  errSIGNUP_EMAIL_IN_USE: {
    en: "This e-mail already has an account. Sign in instead.",
    pt: "Este e-mail já tem uma conta. Entre na sua conta.",
    es: "Este e-mail ya tiene una cuenta. Inicia sesión.",
  },
  errSIGNUP_OTP_NOT_FOUND: {
    en: "We could not find a pending verification. Start again.",
    pt: "Não encontramos uma verificação pendente. Comece novamente.",
    es: "No encontramos una verificación pendiente. Empieza de nuevo.",
  },
  errSIGNUP_OTP_EXPIRED: {
    en: "This code expired. Send a new one.",
    pt: "Este código expirou. Envie um novo.",
    es: "Este código expiró. Envía uno nuevo.",
  },
  errSIGNUP_OTP_INVALID: { en: "That code is not correct.", pt: "Esse código não está correto.", es: "Ese código no es correcto." },
  errSIGNUP_NOT_VERIFIED: {
    en: "Verify your e-mail first.",
    pt: "Verifique o seu e-mail primeiro.",
    es: "Verifica tu e-mail primero.",
  },
  errSIGNUP_NOT_FOUND: {
    en: "We could not find your signup. Start again.",
    pt: "Não encontramos o seu cadastro. Comece novamente.",
    es: "No encontramos tu registro. Empieza de nuevo.",
  },
  errSIGNUP_PLAN_NOT_AVAILABLE: {
    en: "This plan is not available right now. Pick another one.",
    pt: "Este plano não está disponível no momento. Escolha outro.",
    es: "Este plan no está disponible ahora. Elige otro.",
  },
  errSIGNUP_PAYMENT_METHOD_INVALID: {
    en: "We could not use that card. Try another one.",
    pt: "Não foi possível usar esse cartão. Tente outro.",
    es: "No pudimos usar esa tarjeta. Prueba con otra.",
  },
  errSIGNUP_TRIAL_ALREADY_USED: {
    en: "A free trial was already used with this card or e-mail. Choose a plan to continue.",
    pt: "Um teste grátis já foi usado com este cartão ou e-mail. Escolha um plano para continuar.",
    es: "Ya se usó una prueba gratis con esta tarjeta o e-mail. Elige un plan para continuar.",
  },
  errSIGNUP_TRIAL_IN_PROGRESS: {
    en: "Your trial is already being created. Wait a moment.",
    pt: "O seu teste já está sendo criado. Aguarde um instante.",
    es: "Tu prueba ya se está creando. Espera un momento.",
  },
  errSIGNUP_PAYMENT_FAILED: {
    en: "Your card was declined. Try another card.",
    pt: "O seu cartão foi recusado. Tente outro cartão.",
    es: "Tu tarjeta fue rechazada. Prueba con otra tarjeta.",
  },
  errSIGNUP_RATE_LIMITED: {
    en: "Too many attempts. Wait a few minutes and try again.",
    pt: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    es: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  },
  errSIGNUP_GENERIC: {
    en: "Something went wrong. Try again in a moment.",
    pt: "Algo deu errado. Tente novamente em instantes.",
    es: "Algo salió mal. Inténtalo de nuevo en unos instantes.",
  },
  errSIGNUP_NETWORK: {
    en: "We could not reach the server. Check your connection and try again.",
    pt: "Não conseguimos falar com o servidor. Verifique a conexão e tente novamente.",
    es: "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  },
} satisfies Record<string, ShellEntry>

export type SignupTranslationKey = keyof typeof signupEntries
