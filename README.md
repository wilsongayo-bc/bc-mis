# Benedict College Management Information System (MIS)

A comprehensive web-based management information system for Benedict College, built with modern web technologies to streamline academic and administrative operations.

## 🚀 Features

### Academic Management
- **Student Management**: Complete student records, enrollment tracking, and academic history
- **Course & Subject Management**: Curriculum planning, course scheduling, and subject assignments
- **Enrollment System**: Streamlined student enrollment process with payment integration
- **Grade Management**: Grade recording, transcript generation, and academic reporting

### Administrative Features
- **User Management**: Role-based access control (RBAC) with multiple user types
- **Department Management**: Organizational structure and department administration
- **Fee Management**: Configurable tuition and miscellaneous fees with assessment logic
- **Employee Management**: Staff records, position assignments, and role management
- **Payment Processing**: Fee collection, payment tracking, financial reporting, and bank management
- **Bank Management**: Configurable list of banks for check and transfer payments

### Library Management
- **Book Catalog**: Comprehensive book inventory and cataloging system
- **Borrowing System**: Book checkout, return tracking, and overdue management
- **Digital Records**: Searchable database with advanced filtering options

### System Features
- **Dashboard Analytics**: Real-time insights and key performance indicators
- **Settings Management**: System configuration and customization options
- **Responsive Design**: Mobile-friendly interface with modern UI/UX
- **Secure Authentication**: JWT-based authentication with refresh tokens

## 🛠️ Tech Stack

### Frontend
- **React 18+** - Modern UI library with hooks and functional components
- **TypeScript** - Type-safe JavaScript for better development experience
- **Vite** - Fast build tool and development server
- **Tailwind CSS 3+** - Utility-first CSS framework for rapid styling
- **Redux Toolkit** - State management with modern Redux patterns
- **React Router** - Client-side routing and navigation

### Backend
- **Node.js 20.x** - JavaScript runtime environment
- **Express.js** - Web application framework
- **TypeORM** - Object-relational mapping for database operations
- **MySQL 8.x** - Relational database management system
- **JWT** - JSON Web Tokens for secure authentication
- **Bcrypt** - Password hashing and security

### Development Tools
- **ESLint + Prettier** - Code linting and formatting
- **Jest** - Unit testing framework
- **Playwright/Cypress** - End-to-end testing
- **TypeScript** - Static type checking
- **Nodemon** - Development server with hot reload

## 📋 Prerequisites

- **Node.js** 20.x or higher
- **MySQL** 8.x or higher
- **npm** or **yarn** package manager

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd bc-mis
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE bc_mis;
```

### 4. Environment Configuration

⚠️ **Security Notice**: The `.env` file contains sensitive credentials and should never be committed to version control.

1. **Copy the example environment file:**
```bash
cp .env.example .env
```

2. **Edit the `.env` file with your actual values:**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=your_username
DB_PASSWORD=letmein25
DB_DATABASE=bc_mis

# JWT Configuration (generate a secure random string)
JWT_SECRET=your_secure_jwt_secret_key_here
```

### 5. Start Development Server
```bash
npm run dev
```
This will start both the frontend (port 5173) and backend (port 3001) concurrently.

## 📦 Deployment

### Frontend (Vercel)
Refer to [DEPLOYMENT.md](DEPLOYMENT.md) for deploying the frontend to Vercel.

### Backend (VPS/Docker)
Refer to [VPS Deployment Guide](docker/VPS_DEPLOYMENT_GUIDE.md) for deploying the backend API and Database to a VPS using Docker.

## 📚 Documentation

- [Development Setup Guide](DEVELOPMENT_SETUP.md)
- [Migration Guide](MIGRATION_GUIDE.md)
- [Technical Architecture](.trae/documents/School_MIS_Technical_Architecture.md)

## 🧩 UI Consistency: Page Size Dropdown

To standardize pagination controls across list pages, a reusable page-size dropdown component was introduced.

- Component path: `src/components/PageSizeDropdown.tsx`
- Purpose: Provide a uniform selector for items-per-page with consistent styling and behavior
- Options: `25/page`, `50/page`, `100/page`, `200/page`
- Styling: Tailwind CSS with light/dark theme support
- Behavior: Changing the page size resets the current page to `1` and triggers data reload

### Integrated Pages
- `src/pages/ActivityLogs.tsx`
- `src/pages/DocumentRequirements.tsx`
- `src/pages/DocumentCategories.tsx`
- `src/pages/Schedules.tsx`
- `src/pages/UserManagement.tsx`

### Usage
```
import PageSizeDropdown from '../components/PageSizeDropdown';

// local state or Redux value for current limit
<PageSizeDropdown
  value={limit}
  onChange={(n) => {
    // update limit and reset page
    setLimit(n);
    setPage(1);
    // or dispatch Redux actions where applicable
  }}
/>
```

This shared component reduces duplication, ensures a consistent UI/UX, and makes future changes to pagination behavior centralized.

Testing push 12-22-2025
