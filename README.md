# ODR Panel - Case Management Platform for Arbitrators

A working implementation of the Online Dispute Resolution and Case Management
Platform described in the Statement of Work and Software Requirements
Specification, Version 5.0, and its Annexures A and B.

**If you are not a developer**, do not read this file for setup instructions.
Use the step-by-step installation guide instead - see `docs/` in this
repository (or the copy provided alongside this project) for plain-English,
click-by-click instructions to install and run this on your own computer.

## What this is

A single Next.js (TypeScript) application backed by a single PostgreSQL
database - no Docker, no external cloud account, no paid third-party
subscription required to run and evaluate every module described in the
specification. Third-party services the specification treats as
"procured and licensed separately" (video conferencing, e-signature,
payment gateway, SMS/WhatsApp, OCR, LiquidText, and the AI/LLM provider) are
implemented as pluggable stub adapters under `src/lib/adapters/` so every
workflow can be exercised end-to-end locally; see that folder's README for
how to connect a real provider later.

## Developer quick start

```bash
npm install
cp .env.example .env   # then edit .env with your PostgreSQL connection details
npm run prisma:migrate
npm run db:seed
npm run dev
```

Then open http://localhost:3000 and log in with one of the seeded demo
accounts (printed at the end of `npm run db:seed`, all sharing the password
`Passw0rd!1`) - for example `superadmin@odrpanel.local`.

## Project layout

- `prisma/schema.prisma` - the full data model (Annexure B, Section 3).
- `prisma/seed.ts` - demo Institution, the 17 Platform roles, the six
  launch Jurisdiction Rule Profiles (Section 3.1), and one demo user per
  role.
- `src/lib/permissions.ts` - the configuration-driven role/permission
  matrix (Annexure B, Section 2.3).
- `src/lib/jurisdictionEngine.ts` - the Jurisdiction Rule Engine.
- `src/lib/adapters/` - stub third-party integrations (see its own README).
- `src/actions/` - Server Actions implementing every module's mutations,
  each re-checking RBAC at the server layer regardless of what the UI hid.
- `src/app/(portal)/cases/[id]/` - the case workspace, one route per module.

## Security note for this local build

This build authenticates with a built-in email/password + optional TOTP MFA
flow rather than a production Enterprise SSO/OIDC deployment, and is pinned
to Next.js 14.2.35 (the latest patch of the 14.x line). It is intended for
**local evaluation on a single machine**, not for exposing to the public
internet. Before any internet-facing or production deployment: put it
behind real SSO/OIDC, connect real third-party integrations in place of the
stub adapters, and re-run `npm audit` against the framework versions
current at that time.
