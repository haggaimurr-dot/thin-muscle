# Production deployment and outstanding setup

The code in this branch is not automatically deployed. These steps must be applied to the actual server after inspecting its current service and paths. Preserve the existing database, uploads and environment file. Do not replace them with demo data.

## One consolidated checklist for the owner

1. **Server access:** confirm Ubuntu SSH hostname/IP, SSH port (distinct from website port 18095), and a usable login method through a secure channel. No SSH credentials are currently configured in the cloud environment.
2. **HTTPS:** choose a domain, point DNS at the server, and allow 80/443 through the Tencent firewall. The templates use `training.example.com` as a placeholder. The current IP/HTTP endpoint must not be used to transmit passwords. IP certificates are a possible alternative but are not automated here.
3. **SMS:** confirm Twilio Verify or another SMS vendor. The implemented adapter is Twilio Verify; availability and sender/template requirements depend on country. Another vendor requires its own adapter. Supply account SID, auth token and Verify service SID securely.
4. **WeChat:** provide approved Open Platform website app credentials for QR login and official-account credentials for authorization inside WeChat. Configure `/api/v1/auth/wechat/callback` on the HTTPS domain. UnionID must be available from the same Open Platform account to recognize the same person across these modes; otherwise separate identities remain separate. No automatic linking to username/phone accounts is attempted.
5. **Food recognition:** configure the APIKEY.FAN credential on the server and confirm an available vision model. Set `AI_FOOD_ENABLED=true` only after a real test. Do not paste credentials into code. Food photos are sent only after explicit consent, limited to 8MB, decoded and resized, metadata removed. Estimates need user review. Action-video analysis remains deferred.
6. **Payments:** confirm merchant entity/country, currencies and selling region. Stripe Checkout supports cards and optionally Alipay/WeChat Pay when those methods are enabled for that merchant. This is **not native mainland Alipay/WeChat merchant integration**. Current catalog prices are CNY; there is no FX conversion or foreign-currency price catalog. Configure Stripe secret and webhook secret; subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded` at `/api/v1/payments/stripe/webhook`.
7. **Crypto and other platforms:** choose a regulated/hosted payment provider and settlement currency, and confirm business eligibility. Crypto/PayPal/native mainland merchant APIs are not implemented; no wallet keys or arbitrary callback endpoints are accepted. These are outstanding decisions, not enabled features.

## Server preparation

Inspect the current process manager, Nginx site, release path, database location and ownership first. Use a dedicated unprivileged service account; the example uses Ubuntu's `www-data`. Adapt paths if the current installation is elsewhere.

- Put the reviewed release under `/srv/thin-muscle/current`.
- Back up SQLite with Python's `sqlite3.Connection.backup` while the application is live, or stop the service before copying. Back up the environment file separately. Preserve WAL sidecars if copying a stopped database.
- Create `backend/.venv`, install `requirements.txt`; from `frontend`, run `npm ci` and `npm run build` with **no** `VITE_DEMO_MODE=true`.
- Save actual backend configuration in `/etc/thin-muscle/environment` with permissions 0600. Use `.env.example` as a field reference only, adjusting `PUBLIC_ORIGIN` and `DATABASE_URL`.
- Existing tables are preserved. Startup adds the new account/session/sync/order tables through `create_all`. Existing demo users are not claimable by registering a matching nickname. New users start with isolated accounts. Original browser data may be exported before login, then explicitly imported after login.
- Install `thin-muscle.service`, adapt its paths, run `systemctl daemon-reload`, then start it. `StateDirectory` creates `/var/lib/thin-muscle`. Ensure the existing database is copied there with the service account as owner before first start. Backend port 8000 should be loopback-only.

## HTTPS bootstrap

Before using the TLS template, install an HTTP-only Nginx site for the selected domain:

```nginx
server {
    listen 80;
    server_name training.example.com;
    location /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { return 404; }
}
```

Create the challenge directory, validate Nginx configuration with `nginx -t`, and reload. Obtain a trusted certificate, for example with Certbot webroot mode:

```bash
certbot certonly --webroot -w /var/www/letsencrypt -d training.example.com
```

Then install the reviewed `nginx.conf.example` with real names/paths, run `nginx -t`, and reload. Confirm certificate renewal is scheduled and successful renewal reloads Nginx. The TLS template redirects HTTP to HTTPS, sends HSTS, forwards the original scheme, and suppresses OAuth query strings in proxy access logs. Uvicorn trusts forwarded headers only from loopback.

## Release acceptance and rollback

Verify HTTPS trust/redirect, registration/login/logout, rejection of a forged `X-User-Id`, persistence after restart, isolated accounts and two-device sync. Check `/api/v1/auth/capabilities` shows only the channels actually configured. Test SMS/WeChat with provider test accounts, AI food with a non-sensitive test image, and payments in Stripe test mode. Never treat a return-page URL as proof of payment; ownership is granted only after signed webhook verification, exact amount/currency match and idempotent order processing. Webhooks are raw-body signature verified and reject timestamps older than five minutes.

Before enabling live payments, test failed/cancelled and delayed payments, webhook retries and refunds with the merchant provider. Refund/chargeback handling, creator payouts, tax/invoicing, reconciliation and password recovery are not implemented and need separate release decisions. The current 15% split is accounting metadata, not an automatic transfer to creators.

For rollback, stop the service, restore the previous release and reviewed environment file. New tables are additive; do not restore an older database backup over newer user activity without an explicit recovery decision. Keep API credentials out of repository commits and logs.

## Local validation

```bash
cd backend
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m unittest discover -s tests -v
cd ../frontend
npm run build
npm run test:e2e -- app.spec.js
AUTH_E2E=1 npm run test:e2e -- accounts.spec.js
```

Browser tests use temporary databases. The legacy suite explicitly enables demo auth in its own test servers. The account suite disables demo auth and tests real registration, cookies, user isolation and conflict handling. Mocked provider tests validate our request/response handling; they do not establish merchant approval, provider connectivity or successful real transactions.
