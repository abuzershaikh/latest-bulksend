# BulkSend Manager Panel

React + Vite manager dashboard for plan activations and manager-owned customers.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
npm run deploy
```

## Firebase

The app uses the `mailtracker-demo` Firebase project for Google sign-in only.

Manager access, secure user search, manager-owned customer lists, and plan activation now go through the Cloudflare worker API. The browser no longer subscribes to the full `email_data` or `userDetails` collections.

- `chatspromo-manager.pages.dev`
- `mailtracker-demo.firebaseapp.com`
- `mailtracker-demo.web.app`

## Manager API

Default worker base URL:

```bash
https://refer-earn-worker.aawuazer.workers.dev
```

Override in local/dev if needed:

```bash
VITE_MANAGER_API_BASE_URL=https://your-worker-url
```

## Cloudflare Pages

Project: `chatspromo-manager`

Production URL: `https://chatspromo-manager.pages.dev/`
