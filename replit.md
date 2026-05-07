# NexusChat

An AI chatbot platform where users create conversations with an AI assistant and get real-time streaming responses powered by OpenAI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/chatbot run dev` — run the chatbot frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY` — auto-set by Replit AI integration

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui (wouter routing)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- AI: OpenAI via Replit AI Integrations (gpt-5.4, streaming SSE)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/conversations.ts` — conversations table
- `lib/db/src/schema/messages.ts` — messages table
- `lib/integrations-openai-ai-server/` — OpenAI SDK client and utilities
- `artifacts/api-server/src/routes/openai/` — chat conversation and streaming routes
- `artifacts/chatbot/src/` — React frontend

## Architecture decisions

- SSE streaming for AI responses: the `/api/openai/conversations/:id/messages` endpoint streams tokens as `data: {...}\n\n` chunks; frontend parses with fetch + ReadableStream (not generated hooks).
- Orval zod codegen uses `mode: "single"` with a post-processing step to fix the index.ts barrel (avoids name conflicts between Zod schemas and TypeScript types).
- Messages are persisted after full AI response is received, so streaming doesn't block DB writes.
- Cascade delete on messages when conversation is deleted.

## Product

- Create named AI conversations
- Send messages and receive streamed AI responses in real-time
- View full conversation history
- Delete conversations

## User preferences

_Populate as you build_

## Gotchas

- After each OpenAPI spec change, run `pnpm --filter @workspace/api-spec run codegen` — the codegen script patches the api-zod index.ts to avoid duplicate exports.
- Never call `useSendOpenaiMessage` from the frontend for actual message sending — use raw `fetch + ReadableStream` for SSE.
- The `gpt-5.4` model does not support `temperature` or `max_tokens`; use `max_completion_tokens` instead.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
