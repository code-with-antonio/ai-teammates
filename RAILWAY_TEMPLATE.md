# Deploy and Host AI Teammates on Railway

**The open-source alternative to Grok Bot, OpenAI Dots and Meta Muse.** AI teammates with a job, a memory and a cloud computer of their own.

Every prompt, tool and limit is a file in the repository, with auth, billing, usage metering and observability already in place. You start from a working product and change whatever you like.

🎬 [Watch it being built on YouTube](https://www.youtube.com/watch?v=mQBuZ6Dp0u0)

## ✨ Features

- 🧑‍💼 **Teammates with a job** — a name, a job and instructions that each bot keeps in every conversation.
- 🖥️ **A computer per teammate** — a persistent Linux sandbox with a shell, a filesystem and a graphical desktop.
- 👀 **Live desktop view** — watch a bot move the mouse and type, streamed into the chat.
- 👥 **Group chats with handoffs** — a bot passes a request to the teammate whose job it is.
- 🧠 **Memory across chats** — notes a bot saves in one conversation are there in all the others.
- ♾️ **Durable turns** — a long desktop task survives refreshes, redeploys and closed tabs.
- 💳 **Plans and usage limits** — subscriptions, with model spend and sandbox hours metered per billing period.

## ⚠️ Before you deploy

One click gets you the web app, not the whole product. The chat agent runs on Trigger.dev and the database needs its tables, so there are **three steps to do after deploying**. They are listed under "After you deploy" below.

## 🚂 About Hosting AI Teammates

This template deploys one service: the Next.js app, built from the [public repository](https://github.com/code-with-antonio/ai-teammates). Everything else is a managed service you connect with a key.

| Service         | What it does here                                              | Needed   |
| --------------- | -------------------------------------------------------------- | -------- |
| **Clerk**       | Sign-in, plus Billing for plans and feature gates              | Yes      |
| **Neon**        | Postgres, and the AI Gateway the chat model is called through  | Yes      |
| **Daytona**     | One cloud sandbox per bot: shell, files and a desktop          | Yes      |
| **Trigger.dev** | Runs the chat agent and the task that meters running sandboxes | Yes      |
| **Sentry**      | Errors, traces, session replays and logs                       | Optional |

## 🔑 Variables

Railway asks for these when you deploy.

| Variable                                                | Where it comes from                                   |
| ------------------------------------------------------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk dashboard, under API keys                       |
| `DATABASE_URL`                                          | Neon, the pooled connection string                    |
| `DATABASE_URL_UNPOOLED`                                 | Neon, the direct connection string                    |
| `NEON_AI_GATEWAY_BASE_URL`, `NEON_AI_GATEWAY_TOKEN`     | Neon, your AI Gateway                                 |
| `DAYTONA_API_KEY`                                       | Daytona dashboard                                     |
| `TRIGGER_SECRET_KEY`                                    | Trigger.dev, your project's **production** secret key |
| The four `SENTRY` variables                             | Optional. Leave them empty and nothing is reported    |
| The four `NEXT_PUBLIC_CLERK_SIGN_*` variables           | Already filled in. Leave them as they are             |

## 🚀 After you deploy

Do these once, from a clone of the repository:

```bash
git clone https://github.com/code-with-antonio/ai-teammates.git
cd ai-teammates
npm install
```

**1. Create the database tables**

Put your Neon direct connection string in `.env.local` as `DATABASE_URL_UNPOOLED`, then:

```bash
npm run db:push
```

**2. Deploy the tasks to Trigger.dev**

Add your project's ref to `.env.local` as `TRIGGER_PROJECT_REF`, then:

```bash
npx trigger.dev@4.7.3 deploy
```

In Trigger.dev, add these to the project's production environment: `DATABASE_URL`, `CLERK_SECRET_KEY`, `DAYTONA_API_KEY`, `NEON_AI_GATEWAY_BASE_URL` and `NEON_AI_GATEWAY_TOKEN`. Add `NEXT_PUBLIC_SENTRY_DSN` too if you use Sentry.

**3. Set up billing in Clerk**

Enable Billing and create a user plan with two features, slugged `bots` and `sandboxes`. Without them every bot and chat action is refused.

Then open your Railway domain, sign up, pick a plan and create your first teammate.

## 💡 Common Use Cases

- A starting point for your own AI coworker product, with plans, usage limits and metering already working
- Bots that each hold one job, such as research, QA or data entry, and hand requests to each other in a group chat
- Learning how durable agent turns, per-bot sandboxes and computer use fit together in a real codebase

## 📦 Dependencies for AI Teammates Hosting

- A [Clerk](https://clerk.com) application with Billing enabled
- A [Neon](https://neon.com) project with Postgres and an AI Gateway
- A [Daytona](https://www.daytona.io) API key
- A [Trigger.dev](https://trigger.dev) project
- Optionally, a [Sentry](https://sentry.io) project

### Deployment Dependencies

- [Source code and local setup](https://github.com/code-with-antonio/ai-teammates)
- [Clerk Billing](https://clerk.com/docs/billing/overview)
- [Trigger.dev deployment](https://trigger.dev/docs/deployment/overview)
- [Neon connection strings](https://neon.com/docs/connect/connect-from-any-app)

## 🤔 Why Deploy AI Teammates on Railway?

Railway runs the one part of AI Teammates that needs a server. It builds the app from GitHub, gives it a public HTTPS domain, and only sends traffic to a new deployment once `/api/health` answers. There is nothing else to host.

---

Built by [Code With Antonio](https://github.com/code-with-antonio). An independent project, not affiliated with or endorsed by xAI, OpenAI or Meta.
