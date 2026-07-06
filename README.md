# Diamond Centre - API

Backend REST API for Diamond Centre conference management platform.

## Stack

- Node.js
- Express.js
- PostgreSQL
- JWT Authentication
- Mobile Money (MTN / Orange)

## Prerequisites

- Node.js >= 18
- PostgreSQL >= 14

## Installation

```bash
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

## Scripts

| Script       | Description          |
| ------------ | -------------------- |
| `npm run dev`  | Development server   |
| `npm start`    | Production server    |
| `npm test`     | Run tests            |
| `npm run lint` | Lint code            |

## API Documentation

See `/docs/api-contract.md` for the full API contract.

## Branches

| Branch   | Description    |
| -------- | -------------- |
| main     | Production     |
| test     | Pre-production |

## Contributing

See CONTRIBUTING.md
