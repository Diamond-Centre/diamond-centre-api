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
?   ??? config/           # Swagger, app config
?   ??? controllers/      # HTTP layer (req/res)
?   ??? services/         # Business logic
?   ??? repositories/     # Database access
?   ??? models/           # DTO mappers (DB -> API)
?   ??? routes/           # Route definitions
?   ??? middleware/       # Auth, error handling
?   ??? types/            # TypeScript interfaces
?   ??? errors/           # Custom error classes
?   ??? utils/            # Helpers (JWT, QR, dates)
?   ??? db/               # Connection, migrations, schema
??? docs/
?   ??? api-contract.md
??? .github/workflows/ci.yml
??? docker-compose.yml
??? package.json
??? tsconfig.json
```

### Architecture (layered)

```
Routes -> Controllers -> Services -> Repositories -> PostgreSQL
                |            |
           Middleware     Models (mappers)
```

## Branches

| Branch | Description |
| ------ | ----------- |
| main | Production |
| test | Pre-production |

## Contributing

See CONTRIBUTING.md
