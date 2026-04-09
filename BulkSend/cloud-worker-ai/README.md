# bulksender-ai-agent

Cloudflare Worker that proxies BulkSend AI agent chat requests to Gemini.

## Required secret

- `GEMINI_API_KEY`

## Optional config

- `CHATSPROMO_GEMINI_MODEL` defaults to `gemini-2.5-flash`
- `CHATSPROMO_WORKER_CLIENT_TOKEN` protects the ChatsPromo proxy endpoints when set

## Endpoints

- `POST /chat` keeps the BulkSend campaign assistant flow.
- `GET /chatspromo/status` checks whether the ChatsPromo AI Gemini proxy is ready.
- `POST /chatspromo/generate-content` proxies the Android AI Agent Gemini payload with the worker-side API key.

## Local development

1. Copy `.dev.vars.example` to `.dev.vars`
2. Put your real Gemini API key in `.dev.vars`
3. Run `wrangler dev`

## Deploy

Set the production secret once:

```bash
wrangler secret put GEMINI_API_KEY
```

Optional values:

```bash
wrangler secret put CHATSPROMO_WORKER_CLIENT_TOKEN
```

`CHATSPROMO_GEMINI_MODEL` can be changed in `wrangler.toml` under `[vars]`.

Then deploy:

```bash
wrangler deploy
```
