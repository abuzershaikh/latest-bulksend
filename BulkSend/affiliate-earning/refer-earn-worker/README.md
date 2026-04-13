# refer-earn-worker

Cloudflare Worker for affiliate/referral endpoints used by Android app:

- `POST /api/referrals/generate`
- `POST /api/referrals/install-public`
- `POST /api/referrals/install`
- `POST /api/referrals/claim`
- `POST /api/referrals/reward`
- `GET /api/referrals/stats`
- `GET /api/referrals/clicks`
- `GET /api/referrals/installs`
- `GET /api/referrals/referred-users`
- `GET /api/manager/access`
- `GET /api/manager/search?q=...`
- `GET /api/manager/customers`
- `POST /api/manager/activate`
- `GET /r/:code`

## Important

`src/index.js` is the bundled Cloudflare code copy. Keep it as the source of truth.

## Required secrets/vars

Required:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Optional:

- `ANDROID_PACKAGE_NAME` (default `com.message.bulksend`)
- `REFERRAL_PUBLIC_BASE_URL` (set to `https://refer-earn-worker.aawuazer.workers.dev`)
- `REFERRAL_COMMISSION_RATE` (default `30`)
- `ADMIN_API_KEY` (for header based admin auth flow)

## Manager security flow

The manager web panel authenticates with a Firebase ID token and then calls these worker endpoints.

- `GET /api/manager/access` verifies Firebase auth and checks `affiliateManagers/{email}`
- `GET /api/manager/search` returns only secure search matches, not the full user collection
- `GET /api/manager/customers` returns only users attributed to that manager
- `POST /api/manager/activate` writes premium plan fields plus manager attribution metadata

## Local/dev setup

1. Copy `.dev.vars.example` to `.dev.vars`
2. Fill real Firebase values
3. Run:

```bash
wrangler dev
```

## Deploy

```bash
wrangler deploy
```
