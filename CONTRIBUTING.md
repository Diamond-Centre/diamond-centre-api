# Contributing - API

## Workflow

1. Create a branch from `test`
2. Develop
3. Push and open a PR to `test`
4. PR must be reviewed and approved
5. Merge to `test` then later to `main`

## Commit Convention

```
feat(auth): add login endpoint
fix(payment): fix mtn callback
docs(readme): update setup
```

## Before Pushing

- [ ] Lint passes (`npm run lint`)
- [ ] Tests pass (`npm test`)
- [ ] No console.log or debug code
