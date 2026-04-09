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

The app uses the `mailtracker-demo` Firebase project and reads users from the `email_data` and `userDetails` collections. Managers sign in with Google and are gated by the `affiliateManagers` collection.

- `chatspromo-manager.pages.dev`
- `mailtracker-demo.firebaseapp.com`
- `mailtracker-demo.web.app`

## Cloudflare Pages

Project: `chatspromo-manager`

Production URL: `https://chatspromo-manager.pages.dev/`
