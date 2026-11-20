# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Use GitHub's private vulnerability reporting (Security tab → "Report a vulnerability") on this repository. We'll acknowledge within a few days.

## What matters most here

- The MCP server is **public and read-only**; it must never gain the ability to buy, pay or modify a user's cart.
- Skroutz OAuth tokens are stored AES-256-GCM encrypted (key derived from `ADMIN_SECRET`); they must never be logged, returned by an API, or committed.
- The MCP App widget renders untrusted source data: it must use `textContent` (never `innerHTML`) and only open or load allowlisted hosts.
- `/api/refresh` and `/admin` are protected by `ADMIN_SECRET` with constant-time comparison.

If you find a leaked credential in this repository or its history, report it privately so it can be revoked.
