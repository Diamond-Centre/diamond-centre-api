# DICE-PROJECT-BACKEND

Backend API for the DICE application built with Express.js, TypeScript, and PostgreSQL.

## Stack

- **Runtime:** Node.js + Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL
- **Dev tools:** nodemon, ts-node
- **CI/CD:** GitHub Actions
- **Containers:** Docker Compose

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

### 3. Start PostgreSQL

With Docker:

```bash
docker compose up -d
```

### 4. Run in development

```bash
npm run dev
```

API available at `http://localhost:3000`

### 5. Health check

```bash
curl http://localhost:3000/health
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run production build |

## Project structure

```
DICE-PROJECT-BACKEND/
??? src/
?   ??? index.ts      # Express app entry point
?   ??? db.ts         # PostgreSQL connection pool
??? .github/workflows/ci.yml
??? docker-compose.yml
??? package.json
??? tsconfig.json
```
