# Getting Started with [Fastify-CLI](https://www.npmjs.com/package/fastify-cli)
This project was bootstrapped with Fastify-CLI.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

To start the app in dev mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm start`

For production mode

### `npm run test`

Run the test cases.

## Authentication API

All auth routes are prefixed with `/auth`.

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/auth/signup` | Create an account and send an email verification link |
| `POST` | `/auth/login` | Sign in with an email and password |
| `GET` | `/auth/validate-email?token=...` | Validate an email address |
| `POST` | `/auth/resend-validation` | Resend the email verification link |
| `POST` | `/auth/forgot-password` | Send a password reset link |
| `POST` | `/auth/reset-password` | Set a new password using a reset token |

### Email configuration

Email is sent by the `email` plugin. Set `EMAIL_USE_BREVO=true` to use the
Brevo API, or `EMAIL_USE_BREVO=false` to use SMTP. The remaining email settings
are documented in [`.env.example`](./.env.example).

### Database

The auth routes rely on the `EmailVerificationToken` and `PasswordResetToken`
models in [`src/prisma/contract.prisma`](./src/prisma/contract.prisma). After
changing the contract, regenerate the client and update the database:

```bash
npx prisma contract emit
npx prisma db update
```

## Learn More

To learn Fastify, check out the [Fastify documentation](https://fastify.dev/docs/latest/).
