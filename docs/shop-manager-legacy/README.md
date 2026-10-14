# Shop Manager (legacy import)

This folder documents the Shop Manager app that was merged into
365 MotorSales (see `docs/SHOP_MANAGER_MIGRATION_STATUS.md`). The original
standalone project and its hosted editor are no longer used; all code now
lives in this repository under `src/shop-manager/` and is built and deployed
with the main app (Vite + TanStack Start → Cloudflare Worker `motorsales365`).

Local development:

```sh
npm ci --legacy-peer-deps
npm run dev   # http://localhost:8080
```
