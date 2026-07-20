# Trae AI IDE – Project Rules & Guidelines

## 1. Frameworks and Dependencies

Use the specified versions:
    Node.js 20.x
    React 18+ (with Vite as the build tool)
    Tailwind CSS 3+ for styling
    NestJS 10+ (for backend APIs)
    TypeORM for database access
    MySQL 8.x (for database)
    Dependencies must be declared in package.json and locked with package-lock.json or yarn.lock.
    Avoid deprecated or unmaintained libraries; run npm outdated regularly.
    External libraries require approval if they add more than 500KB to the final bundle size.

## 2. Database Access

    Always use the local MySQL instance for development.
    Default MySQL password must be set to: letmein25
    Store database connection credentials in .env files, not directly in the source code.
    Each developer must configure .env.local for local development.
    Production databases must never reuse the local development password.

## 3. Testing Framework & Coverage

    Use Jest for unit testing.
    Use Playwright or Cypress for end-to-end (E2E) testing.
    Maintain at least 80% unit test coverage across all modules.
    New features must include test cases before merging.
    E2E tests must be executed before deployment.

## 4. API Usage Rules

    Avoid experimental/unstable APIs unless documented and approved.
    All third-party API keys must be stored in .env files.
    Never hardcode credentials, except for the local dev MySQL rule above.
    API calls must include proper error handling and retry logic.

## 5. Code Quality & Style

    Follow ESLint + Prettier for consistent coding style.
    Use Tailwind CSS best practices (e.g., avoid excessive inline classes, prefer @apply for reusability).
    Commit messages must follow Conventional Commits (feat:, fix:, chore:, etc.).
    No direct commits to the main branch – use Pull Requests (PRs) with reviews.
    PRs must pass all linting, testing, and build checks before merge.
    Always run `npm run check` and ensure there are no lint errors before pushing updates to the GitHub repository.

## 6. Security & Compliance

    Never push .env files or database credentials to Git.
    Always run npm audit before deployment to check vulnerabilities.
    Encrypt sensitive data in storage and mask them in logs.
    Production deployments must rotate secrets regularly.

## 7. Documentation & Collaboration

    Every new feature must include inline code documentation and an update in README.md or project wiki.
    Architectural decisions must be recorded in ADR (Architecture Decision Records).
    Setup instructions (including MySQL configuration) must be updated in docs/setup.md.

## 8. Performance & Resource Usage

    Optimize React components; avoid unnecessary re-renders.
    Enable Vite build optimizations (vite.config.js tuned for production).
    Apply lazy loading and code-splitting where applicable.
    Database queries must use indexes where needed; avoid unoptimized joins.
    Use caching where possible for expensive API calls. 