import 'dotenv/config'

function envString (name: string, fallback = ''): string {
  return process.env[name] ?? fallback
}

function envBoolean (name: string, fallback = false): boolean {
  const value = process.env[name]

  if (value === undefined || value === '') {
    return fallback
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

function envInt (name: string, fallback: number): number {
  const value = process.env[name]

  if (value === undefined || value === '') {
    return fallback
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }

  return parsed
}

const isProduction = process.env.NODE_ENV === 'production'
const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret && isProduction) {
  throw new Error('JWT_SECRET is required in production')
}

export const config = {
  isProduction,
  appUrl: envString('APP_URL', 'http://localhost:3000').replace(/\/+$/, ''),
  jwt: {
    // The development fallback keeps local setups bootable. Always set JWT_SECRET in production.
    secret: jwtSecret ?? 'picharo-development-only-secret-change-me',
    expiresIn: envString('JWT_EXPIRES_IN', '7d')
  },
  email: {
    useBrevo: envBoolean('EMAIL_USE_BREVO'),
    fromEmail: envString('EMAIL_FROM', 'no-reply@picharo.local'),
    fromName: envString('EMAIL_FROM_NAME', 'Picharo'),
    brevoApiKey: envString('BREVO_API_KEY'),
    smtp: {
      host: envString('SMTP_HOST'),
      port: envInt('SMTP_PORT', 587),
      secure: envBoolean('SMTP_SECURE'),
      user: envString('SMTP_USER'),
      pass: envString('SMTP_PASS')
    }
  },
  tokens: {
    emailVerificationTtlMinutes: envInt('EMAIL_VERIFICATION_TOKEN_TTL_MINUTES', 24 * 60),
    passwordResetTtlMinutes: envInt('PASSWORD_RESET_TOKEN_TTL_MINUTES', 60)
  }
} as const
