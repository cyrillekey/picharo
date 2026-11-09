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

### `npm run lint`

Run ESLint over the project.

### `npm run lint:fix`

Run ESLint and apply fixes that are safe to automate.

### `npm run format`

Format the project with Prettier.

### `npm run check`

Run both the linter and the Prettier check. This is the command to use in CI.

## Authentication API

All auth routes are prefixed with `/auth`.

| Method | Route                            | Description                                           |
| ------ | -------------------------------- | ----------------------------------------------------- |
| `POST` | `/auth/signup`                   | Create an account and send an email verification link |
| `POST` | `/auth/login`                    | Sign in with an email and password                    |
| `GET`  | `/auth/validate-email?token=...` | Validate an email address                             |
| `POST` | `/auth/resend-validation`        | Resend the email verification link                    |
| `POST` | `/auth/forgot-password`          | Send a password reset link                            |
| `POST` | `/auth/reset-password`           | Set a new password using a reset token                |

### Email configuration

Email is sent by the `email` plugin. Set `EMAIL_USE_BREVO=true` to use the
Brevo API, or `EMAIL_USE_BREVO=false` to use SMTP. The remaining email settings
are documented in [`.env.example`](./.env.example).

### Background jobs (BullMQ)

The `bullmq` plugin exposes `fastify.events` for publishing domain events to a
Redis-backed BullMQ queue. Emit an event from a route or another plugin:

```ts
await fastify.events.emit("user.created", {
  userId: user.id,
  email: user.email,
});
```

The consumer runs separately from the API so it can be scaled independently:

```bash
npm run build
npm run worker
```

Worker logs and processing results are printed to stdout. Redis and queue
settings (`REDIS_URL`, `QUEUE_PREFIX`, retries, concurrency, ...) are documented
in [`.env.example`](./.env.example).

To add a new event:

1. Add its payload to `EventPayloads` in
   [`src/queues/events.ts`](./src/queues/events.ts).
2. Add its handler to `defaultEventHandlers` in
   [`src/consumers/events.ts`](./src/consumers/events.ts), or pass a `handlers`
   override to `createEventsWorker`.

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
