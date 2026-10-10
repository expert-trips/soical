# Trips Experts — مركز العمليات

Source code for the Trips Experts operations platform at https://app.tripsexperts.com.

## Development

Requires Node.js >=22.13.0 and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm build
```

The application uses React, Vinext, Cloudflare D1 (`DB`) and R2 (`COMPANY_LOGOS`). Hosting bindings are declared in `.openai/hosting.json`. Database schema migrations are in `drizzle/`.

Production authentication depends on the hosting platform's trusted authenticated-user headers. Configure authentication and storage bindings before deploying outside the existing hosting environment.

## Contents

Includes application source, assets, dependency lockfile, database migrations, and existing tests. Live database records, uploaded customer documents, secrets, dependencies, and generated build output are not included. Publishing this repository does not deploy or migrate the live website.

Imported from local source revision `839da1a`.
