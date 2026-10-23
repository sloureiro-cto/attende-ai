export const verifyOtpTranslations = {
  english: {
    verifyOtp: {
      verificationCodeTitle: "Verification Code",
      login2faTitle: "Two-factor authentication",
      verifyEmailContinueTitle: "Verify Your Email to Continue",
      codeSentToEmail: "A verification code has been sent to the email",
      enterInFieldsBelow: "Enter it in the fields below:",
      verify: "Verify",
      waitToResend: "Please wait {seconds} seconds to resend the code.",
      resendCode: "Resend code",
      codeExpiresIn: "Code expires in ~{minutes} minutes",
      authVerificationFailed: "We couldn't verify your details. Please check and try again.",
      invalidLoginOtp: "Invalid verification code. Please try again.",
      loginChallengeExpired: "Your login session expired. Please sign in again.",
    },
  },
  portuguese: {
    verifyOtp: {
      verificationCodeTitle: "Código de verificação",
      login2faTitle: "Autenticação de dois fatores",
      verifyEmailContinueTitle: "Verifique seu e-mail para continuar",
      codeSentToEmail: "Um código de verificação foi enviado para o e-mail",
      enterInFieldsBelow: "Digite-o nos campos abaixo:",
      verify: "Verificar",
      waitToResend: "Aguarde {seconds} segundos para reenviar o código.",
      resendCode: "Reenviar código",
      codeExpiresIn: "O código expira em ~{minutes} minutos",
      authVerificationFailed: "Não foi possível verificar seus dados. Verifique e tente novamente.",
      invalidLoginOtp: "Código de verificação inválido. Tente novamente.",
      loginChallengeExpired: "Sua sessão de login expirou. Entre novamente.",
    },
  },
  spanish: {
    verifyOtp: {
      verificationCodeTitle: "Código de verificación",
      login2faTitle: "Autenticación de dos factores",
      verifyEmailContinueTitle: "Verifica tu correo para continuar",
      codeSentToEmail: "Se ha enviado un código de verificación al correo",
      enterInFieldsBelow: "Ingrésalo en los campos de abajo:",
      verify: "Verificar",
      waitToResend: "Espera {seconds} segundos para reenviar el código.",
      resendCode: "Reenviar código",
      codeExpiresIn: "El código expira en ~{minutes} minutos",
      authVerificationFailed: "No pudimos verificar tus datos. Revísalos e inténtalo de nuevo.",
      invalidLoginOtp: "Código de verificación inválido. Inténtalo de nuevo.",
      loginChallengeExpired: "Tu sesión de inicio expiró. Inicia sesión de nuevo.",
    },
  },
} as const

export type VerifyOtpTranslationKey = keyof typeof verifyOtpTranslations.english.verifyOtp

export type VerifyOtpVariant = "signup" | "verifyEmail" | "login2fa"
