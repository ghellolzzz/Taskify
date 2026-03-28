# Deploy Taskify (Render)

## 1. Push this repo to GitHub

Render deploys from your Git repository. Push your latest branch to GitHub first.

## 2. Create a Render web service

1. Go to Render dashboard.
2. Click **New +** -> **Blueprint**.
3. Select this repository.
4. Render will detect [`render.yaml`](./render.yaml).
5. Create the service.

## 3. Add required environment variables

In Render service settings, set:

- `DATABASE_URL` = your production PostgreSQL connection string
- `JWT_SECRET_KEY` = a strong random secret
- `JWT_EXPIRES_IN` = `1d` (or your preferred value)
- `JWT_ALGORITHM` = `HS256`

`NODE_ENV` is already set to `production` by the blueprint.

## 4. Database migration on deploy

The service start command runs:

```bash
npx prisma migrate deploy && npm run start:prod
```

So new migrations are applied automatically at deploy/start.

## 5. Verify deployment

After deploy is complete:

- Visit `/health` on your Render URL (should return `{ "status": "ok" }`).
- Open the root URL and verify the homepage renders.
- Test registration/login flow.

## Notes

- Free plan instances can sleep after inactivity.
- If you use Neon for Postgres, keep SSL enabled in the connection string.
