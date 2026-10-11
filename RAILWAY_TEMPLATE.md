# Deploy and Host AI Teammates on Railway

AI Teammates is an open-source take on the AI coworker: bots with a name, a job and a computer of their own. Each one gets a persistent Linux sandbox with a shell, a filesystem and a desktop it controls, and you can watch it work live in the chat. Auth, billing, usage metering and observability are already built in.

## About Hosting AI Teammates

This template deploys the Next.js app as a single Railway service, built from the public repository. The app relies on four outside services, and you bring your own account for each: Clerk for sign-in and billing, Neon for Postgres and the AI Gateway the chat model is called through, Daytona for the sandboxes, and Trigger.dev for the chat agent itself. Railway asks for their keys when you deploy. Sentry is optional: leave its four variables empty and nothing is reported.

Three things live outside Railway and are not done by the deploy. Do them once, from a clone of the repository:

1. **Create the database tables.** Put your Neon direct connection string in `.env.local` as `DATABASE_URL_UNPOOLED` and run `npm run db:push`.
2. **Deploy the tasks to Trigger.dev.** The chat agent and the usage meter run there, not on Railway. Set `TRIGGER_PROJECT_REF` in `.env.local` to your project's ref and run `npx trigger.dev@4.7.3 deploy`. Then add `DATABASE_URL`, `CLERK_SECRET_KEY`, `DAYTONA_API_KEY`, `NEON_AI_GATEWAY_BASE_URL` and `NEON_AI_GATEWAY_TOKEN` to the project's production environment in Trigger.dev, plus `NEXT_PUBLIC_SENTRY_DSN` if you use Sentry.
3. **Set up billing in Clerk.** Enable Billing and create a user plan with two features, slugged `bots` and `sandboxes`. Without them every bot and chat action is refused.

The app is not usable until all three are done: it needs the tables to load, the billing features to create a bot, and the deployed tasks to answer a chat.

## Common Use Cases

- A starting point for your own AI coworker product, with plans, usage limits and metering already working
- Giving a team bots that each hold one job, such as research, QA or data entry, and hand requests to each other in a group chat
- Learning how durable agent turns, per-bot sandboxes and computer use fit together in a real codebase

## Dependencies for AI Teammates Hosting

- A [Clerk](https://clerk.com) application with Billing enabled
- A [Neon](https://neon.com) project with Postgres and an AI Gateway
- A [Daytona](https://www.daytona.io) API key
- A [Trigger.dev](https://trigger.dev) project
- Optionally, a [Sentry](https://sentry.io) project

### Deployment Dependencies

- Source code and local setup: https://github.com/code-with-antonio/ai-teammates
- Clerk Billing: https://clerk.com/docs/billing/overview
- Trigger.dev deployment: https://trigger.dev/docs/deployment/overview
- Neon connection strings: https://neon.com/docs/connect/connect-from-any-app

### Implementation Details

The variables Railway asks for when you deploy:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk dashboard, under API keys |
| `DATABASE_URL` | Neon, the pooled connection string |
| `DATABASE_URL_UNPOOLED` | Neon, the direct connection string |
| `NEON_AI_GATEWAY_BASE_URL`, `NEON_AI_GATEWAY_TOKEN` | Neon, your AI Gateway |
| `DAYTONA_API_KEY` | Daytona dashboard |
| `TRIGGER_SECRET_KEY` | Trigger.dev, the **production** secret key of your project |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Optional, from Sentry |

The four `NEXT_PUBLIC_CLERK_SIGN_*` variables are filled in already and can be left as they are.

## Why Deploy AI Teammates on Railway?

Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying AI Teammates on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on Railway.
