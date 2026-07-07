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
# Edit .env with your configuration
docker compose up -d   # optional, if using Docker for PostgreSQL
npm run dev
```

API available at `http://localhost:3000`

## Scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Production server |
| `npm test` | Run tests |
| `npm run lint` | Lint code |

## Health check

```bash
curl http://localhost:3000/health
```

## API Documentation

See `/docs/api-contract.md` for the full API contract.

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
