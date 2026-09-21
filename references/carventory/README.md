# 🚗 Carventory

**Professional automobile inventory management and dealership platform**

A comprehensive full-stack solution that streamlines car sales, inventory tracking, customer inquiries, and financial analytics for automotive dealerships and traders.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

Carventory is a production-ready, enterprise-grade inventory management system designed specifically for automotive dealerships and traders. Built as a modern monorepo, it combines robust backend services with intuitive user interfaces to deliver a complete dealership management experience.

### Target Audience

- **Automotive Dealerships**: Manage inventory, sales, and customer relationships
- **Car Traders**: Track vehicle acquisitions, pricing, and profit margins
- **Inventory Managers**: Monitor stock levels and vehicle lifecycles
- **Sales Teams**: Process bookings, generate invoices, and track performance
- **Customers**: Browse available inventory and submit purchase inquiries

### System Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Marketplace   │────────▶│   Spring Boot    │◀────────│    Dashboard    │
│   (Next.js)     │         │     Backend      │         │  (React + TS)   │
│  Public Facing  │         │   (Java 21)      │         │  Staff Portal   │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │
                            ┌────────┴────────┐
                            │                 │
                       ┌────▼─────┐     ┌─────▼─────┐
                       │PostgreSQL│     │Cloudinary │
                       │ Database │     │  Storage  │
                       └──────────┘     └───────────┘
```

---

## ✨ Features

### Inventory Management
- **Comprehensive Vehicle Listings**: Manage complete car details including make, model, year, VIN, mileage, and condition
- **Rich Media Support**: Upload up to 15 high-resolution images per vehicle
- **Document Management**: Store and track RC, insurance certificates, and PUC documents
- **Maintenance History**: Record service history and vehicle specifications
- **Smart Soft Delete**: Preserve historical data while maintaining clean active inventory

### Financial Analytics
- **Real-Time Dashboards**: Monitor profit/loss metrics by month, year, and custom date ranges
- **Sales Performance Tracking**: Analyze monthly sales trends and employee contributions
- **Inventory Status Overview**: Visualize available, sold, and maintenance-stage vehicles
- **Professional Reports**: Export detailed financial statements as PDF documents
- **Capital Analysis**: Track stuck capital and inventory holding costs

### User & Access Management
- **Role-Based Access Control**: Granular permissions for admin, staff, and sales roles
- **Multi-Dealership Support**: Manage multiple company profiles with independent branding
- **Employee Directory**: Track staff members and their sales performance
- **Secure Authentication**: JWT-based authentication with email verification
- **Password Security**: Password history tracking and secure reset workflows

### Customer Engagement
- **Inquiry Management**: Process customer requests with budget and preference matching
- **Intelligent Matching**: Automatically suggest vehicles based on inquiry criteria
- **Status Tracking**: Monitor inquiry lifecycle from submission to resolution
- **Automated Notifications**: Email alerts for inquiry updates and responses

### Booking & Sales
- **Streamlined Booking Process**: Create reservations with advance payment tracking
- **Payment Management**: Monitor booking status and payment completion
- **Professional Invoicing**: Generate branded PDF invoices for completed sales
- **Transaction History**: Complete audit trail linking vehicles to buyers

### Public Marketplace
- **Customer-Facing Portal**: Browse available inventory with rich search capabilities
- **Advanced Filtering**: Search by make, model, fuel type, transmission, price range, and location
- **Detailed Vehicle Pages**: High-quality image galleries with comprehensive specifications
- **Direct Communication**: Contact dealerships directly from listings
- **Responsive Design**: Optimized experience across desktop, tablet, and mobile devices

### User Experience
- **Theme Customization**: Toggle between dark and light modes
- **Interactive Visualizations**: Real-time data charts powered by Chart.js
- **Modern UI Design**: Glassmorphism effects and smooth animations
- **Mobile-First Approach**: Fully responsive layouts with Tailwind CSS

---

## 🏗️ Architecture

Carventory is structured as a monorepo containing three integrated applications:

### 1. Backend (Spring Boot)
**Location**: `apps/backend/`

Enterprise Java application providing RESTful APIs and business logic:

- **Authentication & Authorization**: JWT-based security with Spring Security
- **Database Layer**: PostgreSQL with Spring Data JPA and Flyway migrations
- **Core Services**: Cars, Users, Companies, Inquiries, Bookings, Financial Analytics
- **Document Generation**: OpenPDF for invoices and reports
- **Cloud Integration**: Cloudinary for media storage
- **Email Service**: Spring Mail for notifications
- **Scheduled Tasks**: Automated inquiry cleanup and maintenance jobs
- **Caching**: Caffeine cache for performance optimization

### 2. Frontend Dashboard (React)
**Location**: `apps/frontend/`

Authenticated web portal for dealership staff:

- **Framework**: React 18 with TypeScript and Vite
- **UI Components**: Ant Design with Tailwind CSS styling
- **Data Visualization**: Chart.js for analytics dashboards
- **State Management**: React hooks with Axios for API communication
- **Routing**: Protected routes with role-based access
- **Theme System**: Dark/light mode with localStorage persistence

### 3. Marketplace (Next.js)
**Location**: `apps/marketplace/`

Public-facing website for customers:

- **Framework**: Next.js 15 with TypeScript
- **UI Library**: Radix UI primitives with Tailwind CSS
- **Rendering**: Static export for optimal performance
- **SEO Optimization**: Metadata and structured data
- **Animations**: Framer Motion for smooth interactions
- **Icons**: Lucide React icon library

### Data Flow

```
                Customer Browsing
                       ↓
                  Marketplace
                       ↓
              Inquiry Submission
                       ↓
           Dashboard (Staff Review)
                       ↓
                Booking Creation
                       ↓
         Payment & Invoice Generation
                       ↓
         Analytics & Financial Reports
```

---

## 🛠️ Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Backend Framework** | Spring Boot | 3.4.4 | Application foundation |
| **Language** | Java | 21 | Backend development |
| **Database** | PostgreSQL | 12+ | Data persistence |
| **ORM** | Spring Data JPA | - | Database abstraction |
| **Security** | Spring Security + JWT | - | Authentication/Authorization |
| **Migration** | Flyway | - | Schema versioning |
| **Frontend Framework** | React | 18 | Dashboard UI |
| **Marketplace Framework** | Next.js | 15 | Public website |
| **Language** | TypeScript | 5+ | Type-safe development |
| **Build Tool** | Vite | 5+ | Fast dev server |
| **UI Components** | Ant Design | 5+ | Component library |
| **Styling** | Tailwind CSS | 3+ | Utility-first CSS |
| **Charts** | Chart.js | 4+ | Data visualization |
| **Icons** | Lucide React | - | Icon system |
| **HTTP Client** | Axios | 1+ | API communication |
| **PDF Generation** | OpenPDF | - | Report generation |
| **Cloud Storage** | Cloudinary | - | Media management |
| **Email** | Spring Mail | - | Email notifications |
| **Cache** | Caffeine | - | In-memory caching |
| **Build Tool** | Maven | 3.9+ | Backend build |

---

## 🚀 Getting Started

### Prerequisites

Ensure the following software is installed on your system:

- **Java Development Kit**: JDK 21 or higher ([Download](https://adoptium.net/))
- **Node.js**: Version 18+ ([Download](https://nodejs.org/))
- **PostgreSQL**: Version 12+ ([Download](https://www.postgresql.org/download/))
- **Maven**: Version 3.9+ ([Download](https://maven.apache.org/download.cgi))
- **Cloudinary Account**: For media storage ([Sign up](https://cloudinary.com/users/register/free))

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/mohammadumar-dev/carventory.git
cd carventory
```

#### 2. Database Setup

Create a PostgreSQL database for the application:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE carventory;

# Grant permissions
GRANT ALL PRIVILEGES ON DATABASE carventory TO postgres;

# Exit psql
\q
```

#### 3. Backend Setup

```bash
cd apps/backend

# Copy environment template
cp .env.example .env

# Edit .env with your configuration (see Configuration section)

# Install dependencies and build
mvn clean install

# Run the application
mvn spring-boot:run
```

The backend API will start on `http://localhost:8080`

#### 4. Frontend Dashboard Setup

```bash
cd apps/frontend

# Install dependencies
npm install
# or
pnpm install

# Create environment file
echo "VITE_API_BASE_URL=http://localhost:8080/api" > .env

# Start development server
npm run dev
```

The dashboard will be available at `http://localhost:5173`

#### 5. Marketplace Setup

```bash
cd apps/marketplace

# Install dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8080/open-api" > .env.local

# Start development server
npm run dev
```

The marketplace will be available at `http://localhost:3000`

---

## ⚙️ Configuration

### Backend Environment Variables

Create `apps/backend/.env` with the following configuration:

```properties
# Database Configuration
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/carventory
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=your_secure_password
SPRING_JPA_HIBERNATE_DDL_AUTO=validate

# JWT Authentication
JWT_SECRET=your_minimum_32_character_secret_key_here
JWT_EXPIRATION=86400000

# Email Configuration (Gmail example)
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=your_email@gmail.com
SPRING_MAIL_PASSWORD=your_gmail_app_password
SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=true
SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE=true

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Application Settings
SERVER_PORT=8080
SPRING_APPLICATION_NAME=carventory
```

**Important Notes**:
- Replace all placeholder values with your actual credentials
- For Gmail, use an App Password (not your account password): [Generate App Password](https://support.google.com/accounts/answer/185833)
- Generate a secure JWT secret: `openssl rand -base64 32`

### Frontend Environment Variables

Create `apps/frontend/.env`:

```properties
VITE_API_BASE_URL=http://localhost:8080/api
```

For production, replace with your deployed backend URL.

### Marketplace Environment Variables

Create `apps/marketplace/.env.local`:

```properties
NEXT_PUBLIC_API_URL=http://localhost:8080/open-api
```

For production, replace with your deployed backend URL.

---

## 📡 API Documentation

### Base URLs

- **Authenticated API**: `http://localhost:8080/api`
- **Public API**: `http://localhost:8080/open-api`

### Authentication

Protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Core Endpoints

#### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | User login | No |
| POST | `/users/register` | Company registration | No |
| POST | `/users/forgot-password` | Request password reset | No |
| POST | `/users/reset-password` | Reset password with token | No |
| POST | `/users/verify-email` | Verify email address | No |

#### Cars

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/cars` | List all cars | Yes |
| GET | `/cars/{id}` | Get car details | Yes |
| POST | `/cars` | Add new car | Yes |
| PUT | `/cars/{id}` | Update car | Yes |
| DELETE | `/cars/{id}` | Delete car (soft) | Yes |

#### Inquiries

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/inquiries` | List all inquiries | Yes |
| POST | `/inquiries` | Create inquiry | Yes |
| PUT | `/inquiries/{id}` | Update inquiry | Yes |

#### Bookings

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/bookings` | List all bookings | Yes |
| POST | `/bookings` | Create booking | Yes |
| PUT | `/bookings/{id}` | Update booking | Yes |

#### Dashboard

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/dashboard/status` | Get dashboard statistics | Yes |

#### Public API (No Authentication)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/open-api/cars` | Browse available cars | No |
| GET | `/open-api/cars/search` | Search cars with filters | No |
| GET | `/open-api/company/{id}` | Get company details | No |

### Example Requests

#### User Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "ADMIN"
  }
}
```

#### Get Dashboard Statistics

```bash
curl -X GET http://localhost:8080/api/dashboard/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Search Cars (Public)

```bash
curl -X GET "http://localhost:8080/open-api/cars/search?make=Toyota&minPrice=500000&maxPrice=1000000"
```

---

## 🗂️ Project Structure

```
carventory/
├── apps/
│   ├── backend/                    # Spring Boot Application
│   │   ├── src/
│   │   │   ├── main/
│   │   │   │   ├── java/com/carventory/
│   │   │   │   │   ├── controller/      # REST API Controllers
│   │   │   │   │   ├── service/         # Business Logic Layer
│   │   │   │   │   ├── repository/      # Database Access Layer
│   │   │   │   │   ├── entity/          # JPA Entity Models
│   │   │   │   │   ├── dto/             # Data Transfer Objects
│   │   │   │   │   ├── config/          # Spring Configuration
│   │   │   │   │   ├── security/        # Security & JWT
│   │   │   │   │   ├── util/            # PDF & Cloudinary Utils
│   │   │   │   │   └── helper/          # Helper Classes
│   │   │   │   └── resources/
│   │   │   │       ├── db/migration/    # Flyway SQL Migrations
│   │   │   │       └── application.properties
│   │   │   └── test/                    # Unit Tests
│   │   ├── pom.xml                      # Maven Dependencies
│   │   ├── Dockerfile                   # Docker Configuration
│   │   └── .env.example                 # Environment Template
│   │
│   ├── frontend/                   # React Dashboard
│   │   ├── src/
│   │   │   ├── pages/                   # Dashboard Pages
│   │   │   ├── components/              # Reusable Components
│   │   │   ├── services/                # API Client (Axios)
│   │   │   ├── utils/                   # Utility Functions
│   │   │   ├── router/                  # Route Configuration
│   │   │   ├── App.tsx                  # Root Component
│   │   │   └── main.tsx                 # Entry Point
│   │   ├── package.json
│   │   ├── vite.config.ts               # Vite Configuration
│   │   ├── tailwind.config.js           # Tailwind CSS Config
│   │   └── index.html
│   │
│   └── marketplace/                # Next.js Public Site
│       ├── app/                         # Next.js App Router
│       ├── components/                  # React Components
│       ├── lib/                         # Utility Libraries
│       ├── public/                      # Static Assets
│       ├── package.json
│       ├── next.config.js               # Next.js Configuration
│       └── tailwind.config.ts           # Tailwind CSS Config
│
├── LICENSE                         # MIT License
└── README.md                       # This File
```

### Key Directory Descriptions

| Directory | Purpose |
|-----------|---------|
| `backend/entity/` | Database models (Car, User, Company, Booking, Inquiry) |
| `backend/service/` | Business logic and data processing |
| `backend/controller/` | REST API endpoint definitions |
| `backend/repository/` | Database query methods (Spring Data JPA) |
| `backend/db/migration/` | Flyway database version control |
| `frontend/pages/` | Dashboard UI pages (Cars, Bookings, Analytics) |
| `frontend/services/` | Centralized API client configuration |
| `marketplace/app/` | Public marketplace pages and routing |
| `marketplace/components/` | Reusable UI components |

---

## 🔐 Security

### Authentication & Authorization

- **Password Hashing**: All passwords are hashed using bcrypt via Spring Security's `PasswordEncoder`
- **JWT Tokens**: Stateless authentication with configurable expiration (default: 24 hours)
- **Password History**: Prevents reuse of previous passwords
- **Email Verification**: Required for account activation
- **Password Reset**: Secure token-based reset flow with expiration

### Data Protection

- **Soft Delete**: Deleted records are flagged rather than removed for audit trails
- **Company Scoping**: Users can only access data belonging to their company
- **Request Logging**: All API requests are logged for security auditing
- **CORS Configuration**: Restricted cross-origin access in production

### File Upload Security

- **Cloud Storage**: All uploads routed through Cloudinary (no local storage)
- **Authentication Required**: Only authenticated users can upload documents
- **File Type Validation**: Client and server-side validation of file types
- **Size Limits**: Enforced maximum file sizes per upload

### Best Practices

1. **Environment Variables**: Never commit `.env` files to version control
2. **Secret Management**: Store secrets in secure vaults (AWS Secrets Manager, HashiCorp Vault)
3. **JWT Secret Rotation**: Regularly rotate the `JWT_SECRET` value
4. **HTTPS Only**: Always use HTTPS in production environments
5. **Database Credentials**: Use strong, unique passwords for database access
6. **Regular Updates**: Keep dependencies updated to patch security vulnerabilities

---

## 🚢 Deployment

### Recommended Production Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Cloudflare │────▶│   Vercel    │     │    AWS      │
│     CDN     │     │ (Marketplace)│     │     RDS     │
└─────────────┘     └─────────────┘     │ (PostgreSQL)│
                                        └──────┬──────┘
┌─────────────┐     ┌─────────────┐           │
│   Netlify   │     │   AWS EC2   │───────────┘
│ (Dashboard) │     │  (Backend)  │
└─────────────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │ Cloudinary  │
                    │  (Storage)  │
                    └─────────────┘
```

### Backend Deployment

#### Option 1: Traditional Server (AWS EC2, DigitalOcean)

```bash
# Build JAR
cd apps/backend
mvn clean package

# Transfer to server
scp target/carventory-0.0.1-SNAPSHOT.jar user@server:/opt/carventory/

# Run with systemd
sudo systemctl start carventory
```

**Sample systemd service** (`/etc/systemd/system/carventory.service`):

```ini
[Unit]
Description=Carventory Backend
After=network.target

[Service]
User=carventory
WorkingDirectory=/opt/carventory
ExecStart=/usr/bin/java -jar carventory-0.0.1-SNAPSHOT.jar
EnvironmentFile=/opt/carventory/.env
Restart=always

[Install]
WantedBy=multi-user.target
```

#### Option 2: Docker Deployment

```bash
# Build Docker image
cd apps/backend
docker build -t carventory-backend:1.0 .

# Run container
docker run -d \
  --name carventory-backend \
  -p 8080:8080 \
  --env-file .env \
  carventory-backend:1.0
```

#### Option 3: Platform-as-a-Service (Heroku, Railway, Render)

1. Connect your Git repository
2. Set environment variables in platform dashboard
3. Platform auto-detects Maven and deploys

### Frontend Dashboard Deployment

#### Netlify / Vercel

```bash
cd apps/frontend

# Build production assets
npm run build

# Deploy (example with Netlify CLI)
netlify deploy --prod --dir=dist
```

**Build settings**:
- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables: Set `VITE_API_BASE_URL` to production backend URL

### Marketplace Deployment

#### Vercel (Recommended for Next.js)

```bash
cd apps/marketplace

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

Set environment variable:
- `NEXT_PUBLIC_API_URL`: Production backend URL

#### Static Export

```bash
npm run build
# Output in 'out' directory - serve with any static host
```

### Database

**Managed PostgreSQL** (Recommended):
- AWS RDS
- Azure Database for PostgreSQL
- Google Cloud SQL
- DigitalOcean Managed Databases

**Configuration**:
- Enable automated backups
- Set up read replicas for high traffic
- Use connection pooling (HikariCP configured in Spring Boot)

### Docker Compose (Full Stack)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: carventory
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./apps/backend
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/carventory
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME}
      CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY}
      CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET}
    depends_on:
      - postgres

volumes:
  postgres_data:
```

Run with: `docker-compose up -d`

---

## 🔧 Troubleshooting

### Backend Issues

#### Problem: Backend fails to start with "Connection refused to PostgreSQL"

**Solution**:
```bash
# Verify PostgreSQL is running
sudo systemctl status postgresql
# or
psql -U postgres -c "SELECT version();"

# Check connection details in .env
echo $SPRING_DATASOURCE_URL

# Create database if missing
createdb carventory

# Test connection
psql -U postgres -d carventory -c "SELECT 1;"
```

#### Problem: Flyway migration fails with "Schema creation failed"

**Solution**:
```bash
# Grant full permissions
psql -U postgres -d carventory -c "GRANT ALL PRIVILEGES ON DATABASE carventory TO postgres;"

# Clean and rebuild
dropdb carventory && createdb carventory
cd apps/backend && mvn flyway:migrate

# Check migration files
ls -la apps/backend/src/main/resources/db/migration/
```

#### Problem: "JWT token expired" error

**Solution**:
- Users must log in again to obtain a fresh token
- Adjust expiration in `.env`: `JWT_EXPIRATION=172800000` (48 hours)
- Implement refresh token mechanism for better UX

### Frontend Issues

#### Problem: CORS error when connecting to backend

**Solution**:
```java
// Verify CORS configuration in Spring Security
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.addAllowedOrigin("http://localhost:5173");
    configuration.addAllowedMethod("*");
    configuration.addAllowedHeader("*");
    configuration.setAllowCredentials(true);
    // ...
}
```

#### Problem: Build fails with "Module not found"

**Solution**:
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf dist .vite
npm run build

# Verify Node version
node --version  # Must be 18+
```

#### Problem: Dark mode doesn't persist after reload

**Solution**:
```javascript
// Check localStorage in DevTools
localStorage.getItem('theme')

// Clear cache if needed
localStorage.clear()

// Verify theme toggle logic
console.log(document.documentElement.classList.contains('dark'))
```

### Cloud Services

#### Problem: Cloudinary uploads failing

**Solution**:
```bash
# Verify credentials
echo $CLOUDINARY_CLOUD_NAME
echo $CLOUDINARY_API_KEY

# Test with curl
curl -X POST "https://api.cloudinary.com/v1_1/$CLOUDINARY_CLOUD_NAME/image/upload" \
  -F "file=@test.jpg" \
  -F "upload_preset=unsigned_preset"

# Check account limits in Cloudinary dashboard
```

#### Problem: Email verification not working

**Solution**:
```bash
# For Gmail, use App Password (not account password)
# Generate at: https://myaccount.google.com/apppasswords

# Verify SMTP settings
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=your_email@gmail.com
SPRING_MAIL_PASSWORD=your_16_char_app_password

# Check logs for email send attempts
grep "Mail" logs/spring.log
```

### Performance Issues

#### Problem: Slow dashboard loading

**Solution**:
- Enable Caffeine cache in Spring Boot
- Optimize database queries with indexes
- Implement pagination for large datasets
- Use React.lazy() for code splitting

#### Problem: Database connection pool exhausted

**Solution**:
```properties
# Adjust HikariCP settings in application.properties
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
```

---

## 🤝 Contributing

Contributions are welcome and appreciated! Here's how you can help improve Carventory:

### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/carventory.git
   cd carventory
   ```
3. **Create a feature branch**:
   ```bash
   git checkout -b feature/amazing-new-feature
   ```

### Development Workflow

1. Make your changes following the existing code style
2. Write tests for new functionality
3. Ensure all tests pass: `mvn test` (backend) and `npm test` (frontend)
4. Update documentation if needed
5. Commit your changes:
   ```bash
   git commit -m "Add amazing new feature"
   ```
6. Push to your fork:
   ```bash
   git push origin feature/amazing-new-feature
   ```
7. Open a Pull Request on GitHub

### Coding Standards

- **Java**: Follow Spring Boot conventions and use meaningful variable names
- **TypeScript/React**: Use functional components with hooks
- **Formatting**: Run `mvn spotless:apply` (backend) before committing
- **Commit Messages**: Use clear, descriptive messages (e.g., "Fix booking date validation")

### Areas for Contribution

- 🧪 **Testing**: Expand test coverage for backend services
- 📚 **Documentation**: Improve API docs and user guides
- 🎨 **UI/UX**: Enhance dashboard and marketplace design
- 🐛 **Bug Fixes**: Resolve open issues
- ✨ **Features**: Implement new functionality from the roadmap

### Reporting Issues

Found a bug? Please [open an issue](https://github.com/mohammadumar-dev/carventory/issues) with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Java version, browser)

---
