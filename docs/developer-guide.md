# Developer Guide & Best Practices

Welcome to the Benedict College MIS project! This guide is designed to help you get started quickly and follow our development standards.

## 1. Getting Started

### Prerequisites
- **Node.js**: v20.x
- **MySQL**: v8.x
- **Package Manager**: npm

### Installation
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment variables:
    - Copy `.env.example` to `.env` (create one if it doesn't exist based on `project_rules.md`).
    - Set `MYSQL_PASSWORD=letmein25` for local development.

### Running the Project
- **Development Mode**:
    ```bash
    npm run dev
    ```
    This runs both the React frontend (Vite) and NestJS/Express backend concurrently.

## 2. Development Workflow

### Branching Strategy
- **Feature Branches**: Create branches from `main` or `develop` (e.g., `feat/user-auth`).
- **Naming Convention**: `type/description` (e.g., `feat/new-login`, `fix/header-bug`).
- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat: add login page`, `fix: resolve crash`).

### Code Quality Checks
Before pushing any code, you **MUST** run the following commands to ensure quality:

1.  **Type Check**:
    ```bash
    npm run check
    ```
    (Runs `tsc --noEmit` to catch TypeScript errors)

2.  **Linting**:
    ```bash
    npm run lint
    ```
    (Runs `eslint .` to catch style and logic errors)

> **Rule:** Never push code that fails these checks.

## 3. Project Architecture

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js (Express/NestJS structure) + TypeORM
- **Database**: MySQL

### Key Directories
- `src/`: Frontend React application.
- `api/`: Backend API logic.
- `docs/`: Project documentation.
- `.trae/rules/`: Project-specific rules (READ THESE).

## 4. Best Practices

### Styling
- Use **Tailwind CSS**.
- Avoid inline styles.
- Use the shared `PageSizeDropdown` component for pagination consistency.

### Database
- Always use the local MySQL instance.
- Do not hardcode credentials.
- Use migrations for schema changes.

### Testing
- Write unit tests for new logic (Jest).
- Ensure 80% coverage.

## 5. Deployment
- Production builds: `npm run build`
- Do not commit `.env` files.

---
*For detailed rules, refer to `.trae/rules/project_rules.md`.*
