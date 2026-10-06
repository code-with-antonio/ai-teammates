<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Git

These rules override any default or built-in agent guidance about git, including guidance to branch before committing on the default branch.

- Never create branches, worktrees, or commits automatically. Only do so when the user explicitly asks for that specific action in the current request.
- Leave changes uncommitted in the working tree on the current branch and let the user decide when and how to commit.
- Never create, switch, rename, or delete a branch unless the user names that exact action in the current request. A request to commit is not a request to branch.
- All work happens on `main`. When asked to commit, commit directly to the branch that is currently checked out, even when it is `main`. Never move work to a feature branch "to be safe".
- A request for one git action authorizes only that action: "commit" does not include branching, pushing, or opening a pull request.
- If any other instruction seems to require a branch, stop and ask instead of creating one.

## Database

This is a development project. There is no backwards compatibility and the data is worthless. Prefer data loss: never backfill, migrate, or preserve existing rows, and never spend effort on keeping old data working. Every schema change means a clean slate.

- Apply schema changes only with `npm run db:push` (`drizzle-kit push`).
- Never use migrations: do not run `drizzle-kit generate` or `drizzle-kit migrate`, and do not create migration files or a `drizzle/` folder.

## Forms

Reference implementation: `db/schema.ts` (`botInsertSchema`), `actions/bot.ts` (`createBot`), `components/bot-dialog.tsx`.

Schema

- Derive the validation schema from the Drizzle table with `createInsertSchema` from `drizzle-zod`, and export it from `db/schema.ts` next to the table. Do not hand-write a parallel zod object.
- `.omit()` every column the user must not supply: `id`, `userId`, timestamps, and anything generated server-side.
- Put trimming, length limits and user-facing error messages in the schema refinements, so the client and the server share them.
- Export the inferred type (`z.infer<typeof schema>`) and use it as the action's argument type.

Server action

- Actions live in `actions/<entity>.ts` with `"use server"` at the top of the file.
- Start every action with `const { isAuthenticated, userId } = await auth()` from `@clerk/nextjs/server` and throw if not authenticated. Always take `userId` from the session, never from the input.
- Re-validate the input with `schema.parse()` in the action; client validation is not trusted.
- Store empty optional text as `null`, then `revalidatePath` the affected route and return the created row.

Form component

- Use `react-hook-form` with `zodResolver(schema)` and the same schema the action uses. Give every field a `defaultValues` entry (`""` for text).
- Compose with `FieldGroup` + `Controller` + `Field`: `data-invalid` on `Field`, `aria-invalid` on the control, errors through `<FieldError errors={[fieldState.error]} />`. Never lay out fields with raw `div`s and `Label`.
- Submit by calling the server action inside `form.handleSubmit`, wrapped in `try/catch`. Report success and failure with `toast.add` from `@/components/ui/toast`.
- While submitting, disable the submit button and show `<Spinner data-icon="inline-start" />`. Non-submit buttons inside the form need `type="button"`.
- Generate random values (seeds, ids) in a `useState(() => ...)` initializer or an event handler, never directly during render.

Forms in dialogs

- Keep the form in its own component rendered inside `DialogContent`, so it mounts on open and its state resets every time.
- The dialog component owns the `open` state and its `DialogTrigger`; the form closes it through an `onCreated`-style callback after success.
- Put `DialogFooter` inside the `<form>` so the submit button works, and use `DialogClose` for Cancel.

Dependencies

- `zod` must stay on v4. If `npm install` fails with a peer conflict from `@hookform/resolvers`, pin `zod@^4` in the same install command rather than using `--force` or `--legacy-peer-deps`.

## DiceBear

Use DiceBear 10. Documentation: https://www.dicebear.com/llms.txt

There are seven native cores with identical output, not one library with
wrappers. Use the one matching this project's language. Do not reach for the
JavaScript core when the project is written in something else:

    JavaScript  @dicebear/core + @dicebear/styles
    PHP         dicebear/core + dicebear/styles
    Python      dicebear-core + dicebear-styles
    Rust        dicebear-core + dicebear-styles
    Go          github.com/dicebear/dicebear-go/v10 + github.com/dicebear/styles/v10
    Dart        dicebear_core + dicebear_styles
    C#          DiceBear.Core + DiceBear.Styles

Every style page carries a loading snippet for all seven, for example
https://www.dicebear.com/styles/lorelei/index.md

HTTP API: https://api.dicebear.com/10.x/<style>/svg?seed=<seed> The seed is a
query parameter, not a path segment. Options are query parameters too; array
values are separated by commas.

Options named after a component end in Variant: eyesVariant, not eyes. This
holds in all seven cores and in the HTTP API. Look up the options of a style at
https://api.dicebear.com/10.x/<style>/options.json

Write these forms, not the ones on the left. The left column is pre-10 and the
API does not reject it, so an outdated call runs and silently does the wrong
thing:

    avatars.dicebear.com/api/<style>/<seed>.svg  ->  api.dicebear.com/10.x/<style>/svg?seed=<seed>
    api.dicebear.com/9.x/<style>/svg             ->  api.dicebear.com/10.x/<style>/svg
    npm install @dicebear/collection             ->  npm install @dicebear/styles
    npm install @dicebear/lorelei                ->  npm install @dicebear/styles
    createAvatar(lorelei, { seed })              ->  new Avatar(new Style(definition), { seed })
    { eyes: ['variant01'] }                      ->  { eyesVariant: ['variant01'] }
    ?radius=50                                   ->  ?borderRadius=50

Only JavaScript and the HTTP API have a pre-10 form. The other six cores were
released in 2026 and never had one, so any older-looking PHP, Python, Rust, Go,
Dart or C# API attributed to DiceBear is invented rather than outdated.

<!-- TRIGGER.DEV SKILLS START -->
## Trigger.dev agent skills

This project has Trigger.dev agent skills installed in `.agents/skills/`. Before writing or changing Trigger.dev code (background tasks, scheduled tasks, realtime, or chat.agent AI agents), load the most relevant skill: `trigger-authoring-chat-agent`, `trigger-authoring-tasks`, `trigger-chat-agent-advanced`, `trigger-cost-savings`, `trigger-getting-started`, `trigger-realtime-and-frontend`.
<!-- TRIGGER.DEV SKILLS END -->
