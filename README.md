# Diamond Centre - API

Backend REST API for the Diamond Centre (DICE) platform built with Express.js, TypeScript, and PostgreSQL.

## Stack

- Node.js + Express.js
- TypeScript
- PostgreSQL
- JWT Authentication
- Mobile Money (MTN / Orange)
- Docker Compose
- GitHub Actions CI

## Prerequisites

- Node.js >= 18
- PostgreSQL >= 14 (or Docker)

## Installation

```bash
npm install
cp .env.example .env
npm run db:start   # start local PostgreSQL
npm run dev
```

API available at `http://localhost:3000`

## Scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Production server |
| `npm run db:start` | Start local PostgreSQL for this project |
| `npm run db:stop` | Stop local PostgreSQL |
| `npm test` | Run tests |
| `npm run lint` | Lint code |

## Health check

```bash
curl http://localhost:3000/health
```

## API Documentation (Swagger)

- UI: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- OpenAPI JSON: [http://localhost:3000/api-docs.json](http://localhost:3000/api-docs.json)

La specification suit le contrat dans `docs/api-contract.md`.

## API Contract

## Project structure

```
DICE-PROJECT-BACKEND/
??? src/
?   ??? index.ts      # Express app entry point
?   ??? db.ts         # PostgreSQL connection pool
??? docs/
?   ??? api-contract.md
??? .github/workflows/ci.yml
??? docker-compose.yml
??? package.json
??? tsconfig.json
```

## Branches

| Branch | Description |
| ------ | ----------- |
| main | Production |
| test | Pre-production |

## Contributing

See CONTRIBUTING.md
