# Genesis UI

React 19 + TypeScript + Vite + MUI + TanStack Query. Web front end for the Genesis FIS migration.

## Run locally
```
npm install
npm run dev      # http://localhost:5173, proxies /api to http://localhost:5000
npm test         # vitest
npm run build
```
Set `VITE_API_TARGET` to point the dev proxy at another API.

## Structure
- `src/api/` fetch client (adds the JWT) and one file per API area.
- `src/auth/` login state, route guards, legacy `USRAccess` permission check.
- `src/config/navigation.ts` the one place to register a screen: menu, route and permission position.
- `src/features/<module>/` one folder per migrated screen.
- `src/layout/` application shell.

Add a screen: create `features/<name>/`, add the API file, add an entry in `navigation.ts`, add the route in `App.tsx`.
