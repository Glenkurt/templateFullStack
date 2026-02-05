# CLAUDE.md - AI Assistant Guide

This document provides essential context for AI assistants working with this codebase.

## Project Overview

A production-ready full-stack template featuring:
- **Backend**: .NET 10 Web API with PostgreSQL, JWT authentication, Serilog logging
- **Frontend**: Angular 19 with standalone components, signals, functional interceptors
- **Database**: PostgreSQL 15
- **Infrastructure**: Docker, Docker Compose, GitHub Actions CI/CD

## Directory Structure

```
templateFullStack/
├── api/
│   ├── Api/                      # Main API project
│   │   ├── Controllers/          # HTTP endpoints (AuthController, HealthController)
│   │   ├── Services/             # Business logic (IAuthService, IHealthService)
│   │   ├── Models/
│   │   │   ├── Entities/         # EF Core entities (ApplicationUser, RefreshToken)
│   │   │   └── DTOs/             # Data transfer objects
│   │   ├── Data/                 # AppDbContext
│   │   ├── Middleware/           # GlobalExceptionHandlingMiddleware
│   │   ├── Extensions/           # ServiceCollectionExtensions (DI registration)
│   │   └── Migrations/           # EF Core migrations
│   └── Api.Tests/                # xUnit integration tests
├── frontend/
│   └── src/app/
│       ├── core/                 # Singletons (auth service, guards, interceptors)
│       ├── shared/               # Reusable components
│       ├── features/             # Lazy-loaded modules (auth, dashboard, unauthorized)
│       ├── services/             # API services
│       └── environments/         # Environment configuration
├── scripts/                      # Database migration scripts
├── .github/workflows/            # CI/CD pipeline (ci.yml)
├── docker-compose.yml            # Container orchestration
├── Dockerfile                    # Multi-stage build
└── .env.example                  # Environment variables template
```

## Development Commands

### Backend (.NET)
```bash
cd api/Api
dotnet run                        # Start API on http://localhost:5093
dotnet watch run                  # Auto-restart on changes
dotnet build                      # Compile
dotnet test                       # Run xUnit tests
```

### Frontend (Angular)
```bash
cd frontend
npm install                       # Install dependencies
npm start                         # Dev server on http://localhost:4200
npm run build                     # Production build
npm test                          # Run Karma tests
npm run lint                      # ESLint check
npm run lint:fix                  # Auto-fix lint issues
npm run format                    # Prettier formatting
```

### Database
```bash
./scripts/db-add-migration.sh <MigrationName>    # Create migration
./scripts/db-update.sh                           # Apply migrations
```

### Docker
```bash
docker-compose up db -d           # Start only PostgreSQL
docker-compose up --build         # Build and start all services
docker-compose down               # Stop containers
docker-compose down -v            # Stop and reset database
```

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/health` | GET | No | Health check with DB connectivity |
| `/api/v1/auth/login` | POST | No | JWT token generation |
| `/api/v1/auth/refresh` | POST | No | Refresh token (rate-limited: 10 req/min) |
| `/api/v1/auth/me` | GET | Yes | Current user info |

## Architecture Patterns

### Backend (.NET)
- **Layered Architecture**: Controllers → Services → Data
- **Dependency Injection**: Registered in `Extensions/ServiceCollectionExtensions.cs`
- **Error Handling**: RFC 7807 ProblemDetails via `GlobalExceptionHandlingMiddleware`
- **Logging**: Serilog with structured logging
- **Configuration**: `appsettings.json` with environment variable overrides
- **API Versioning**: Routes prefixed with `/api/v1/`

### Frontend (Angular)
- **Standalone Components**: No NgModules, using Angular 17+ standalone API
- **State Management**: Angular Signals (not NgRx)
- **Routing**: Lazy-loaded feature modules with `loadComponent()`
- **HTTP**: Functional interceptors (`authInterceptor`, `errorInterceptor`)
- **Guards**: Functional guards (`authGuard`, `roleGuard`)
- **Services**: Singleton pattern with `providedIn: 'root'`

### Authentication Flow
1. Login request → AuthService validates credentials
2. Generate JWT + refresh token → Store refresh token hash in DB
3. Set HttpOnly cookie → Return tokens to client
4. Frontend stores token in AuthService signal state

## Code Conventions

### Backend
- **Naming**: PascalCase for classes, methods, properties
- **Async**: All I/O operations use async/await with `Async` suffix
- **Interfaces**: Prefix with `I` (e.g., `IAuthService`)
- **DTOs**: Suffix with `Dto` or use descriptive names like `LoginRequest`
- **Services**: Interface + implementation pattern

### Frontend
- **Components**: PascalCase with `.component.ts` suffix
- **Services**: camelCase methods, PascalCase classes
- **Files**: kebab-case file names
- **TypeScript**: Strict mode enabled (`noImplicitAny`, `strictNullChecks`)
- **Signals**: Use for reactive state, `computed()` for derived values

### Database
- **Tables**: PascalCase (Users, RefreshTokens)
- **Migrations**: Descriptive names (e.g., `InitialAuthSchema`)

## Testing

### Backend Integration Tests
- Framework: xUnit + FluentAssertions
- Location: `api/Api.Tests/`
- Uses `WebApplicationFactory` with in-memory database
- Example: `Integration/HealthEndpointTests.cs`

```bash
cd api/Api.Tests && dotnet test
```

### Frontend Unit Tests
- Framework: Karma + Jasmine
- Run: `npm test -- --watch=false --browsers=ChromeHeadless`

## Configuration Files

| File | Purpose |
|------|---------|
| `api/Api/appsettings.json` | Backend config (DB, JWT, CORS, Serilog) |
| `frontend/angular.json` | Angular CLI config |
| `frontend/proxy.conf.json` | Dev proxy to backend API |
| `frontend/.eslintrc.json` | ESLint rules |
| `frontend/.prettierrc` | Code formatting |
| `docker-compose.yml` | Container orchestration |
| `.env.example` | Environment variables template |

## Common Tasks

### Add a New API Endpoint
1. Create controller method in `api/Api/Controllers/`
2. Add DTOs in `api/Api/Models/DTOs/` if needed
3. Create service interface + implementation in `api/Api/Services/`
4. Register service in `Extensions/ServiceCollectionExtensions.cs`
5. Add integration tests in `api/Api.Tests/`

### Add a New Angular Component
1. Generate: `ng generate component features/component-name`
2. Add route in `frontend/src/app/app.routes.ts` with lazy loading
3. Apply guards if authentication required

### Add a Database Migration
1. Modify entity in `api/Api/Models/Entities/`
2. Run: `./scripts/db-add-migration.sh MigrationName`
3. Review generated migration in `api/Api/Migrations/`
4. Apply: `./scripts/db-update.sh`

### Add Protected Route (Frontend)
```typescript
{
  path: 'protected',
  loadComponent: () => import('./features/protected').then(m => m.ProtectedComponent),
  canActivate: [authGuard]
}
```

## Environment Setup

### Required Environment Variables
```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<secure_password>
POSTGRES_DB=templatedb

# JWT
JWT_SECRET=<min_32_characters>
JWT_ISSUER=https://your-domain.com
JWT_AUDIENCE=https://your-domain.com
JWT_EXPIRY_MINUTES=60
JWT_REFRESH_EXPIRY_DAYS=7
```

### Local Development Setup
1. Copy `.env.example` to `.env` and configure
2. Start PostgreSQL: `docker-compose up db -d`
3. Start backend: `cd api/Api && dotnet run`
4. Start frontend: `cd frontend && npm start`
5. Access: http://localhost:4200 (proxies to backend)

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`):
1. **Backend Job**: Restore → Build → Test
2. **Frontend Job**: Install → Lint → Test → Build
3. **Docker Job**: Build multi-stage image
4. **Security Job**: Trivy vulnerability scan

## Important Notes

### Security
- Never commit `.env` files or secrets
- JWT secrets must be at least 32 characters
- Refresh tokens are hashed before storage
- Rate limiting enabled on auth endpoints
- CORS configured for `http://localhost:4200` in development

### Performance
- Frontend uses lazy loading for feature modules
- Backend uses async/await for all I/O
- Docker uses multi-stage builds for smaller images

### Error Handling
- Backend returns RFC 7807 ProblemDetails for all errors
- Frontend `errorInterceptor` handles HTTP errors globally
- Stack traces hidden in production

### Database
- Migrations auto-apply in development via `Database.Migrate()`
- Use `docker-compose down -v` to reset database completely
- Connection string uses environment variables in production

## Key Files Reference

| Purpose | File Path |
|---------|-----------|
| API entry point | `api/Api/Program.cs` |
| JWT authentication | `api/Api/Services/AuthService.cs` |
| DB context | `api/Api/Data/AppDbContext.cs` |
| Frontend auth | `frontend/src/app/core/services/auth.service.ts` |
| App routes | `frontend/src/app/app.routes.ts` |
| HTTP interceptors | `frontend/src/app/core/interceptors/` |
| Route guards | `frontend/src/app/core/guards/` |
