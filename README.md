# Prospect2000 Dashboard

Application full-stack Prospect2000 avec :

- **Backend**: .NET 10 Web API with PostgreSQL, JWT Auth, Serilog
- **Frontend**: Angular 19 with standalone components, signals, interceptors
- **Database**: PostgreSQL 15
- **Containerization**: Docker & Docker Compose with health checks
- **CI/CD**: GitHub Actions pipeline

## Etat Actuel

- Le lot fonctionnel Prospect2000 jusqu'au dashboard est livre et la recette transverse US-014 a ete validee le 2026-04-12.
- Le projet est exploitable en local pour developpement, demo et recette.
- Le rapport d'audit du 2026-04-11 conclut que le depot n'est pas encore pret pour une mise en production sans remediations de securite, d'infrastructure et de couverture de tests.

Documents de reference :

- Audit complet : [.github/CODE_AUDIT_REPORT.md](.github/CODE_AUDIT_REPORT.md)
- Backlog courant : [.github/tasks/Prospect2000-User-Stories.md](.github/tasks/Prospect2000-User-Stories.md)
- Tracker d'execution : [.github/tasks/Prospect2000-Execution-Tracker.md](.github/tasks/Prospect2000-Execution-Tracker.md)

## 📁 Project Structure

```
Prospect2000 Dashboard/
├── api/
│   └── Api/
│       ├── Controllers/      # API endpoints
│       ├── Services/         # Business logic layer
│       ├── Models/DTOs/      # Data transfer objects
│       ├── Middleware/       # Exception handling, etc.
│       ├── Extensions/       # DI registration helpers
│       └── Data/             # EF Core DbContext
├── frontend/
│   └── src/app/
│       ├── core/             # Singletons (auth, interceptors, guards)
│       ├── shared/           # Reusable components
│       ├── features/         # Lazy-loaded feature modules
│       └── services/         # API services
├── .github/workflows/        # CI/CD pipeline
├── docker-compose.yml        # Container orchestration
├── Dockerfile                # Multi-stage build
└── .env.example              # Environment variables template
```

## 🚀 Quick Start

### Option 1: Docker local

```bash
# Copy environment template and configure
cp .env.example .env
# Edit .env with your values

# Start all services
docker-compose up --build

# Acces applicatif selon votre configuration Docker
```

### Option 2: Local Development

**Prerequisites:**

- .NET 10 SDK
- Node.js 20+
- PostgreSQL 15 (or use Docker for DB only)

**Start PostgreSQL:**

```bash
docker-compose up db -d
```

The local Docker PostgreSQL service is exposed on `localhost:5433` by default to avoid collisions with an existing host PostgreSQL instance on `5432`.

**Apply migrations:**

```bash
./scripts/db-update.sh
```

**Start the API:**

```bash
cd api/Api
dotnet run
# API runs on http://localhost:5093
```

In `Development`, the API can bootstrap a local user from the `DevelopmentBootstrapUser`
configuration. This is a local convenience only and is part of the post-audit hardening backlog.

If `dotnet run` fails with `address already in use`, another local process is already bound to
port `5093`; stop that process before retrying.

**Start Angular (separate terminal):**

```bash
cd frontend
npm install
npm start
# Frontend runs on http://localhost:4200
```

## 🔗 API Endpoints

| Endpoint                    | Auth | Description                             |
| --------------------------- | ---- | --------------------------------------- |
| `GET /api/v1/health`        | No   | Health check with database connectivity |
| `POST /api/v1/auth/login`   | No   | Authenticate and get JWT tokens         |
| `POST /api/v1/auth/refresh` | No   | Refresh expired access token            |
| `GET /api/v1/auth/me`       | Yes  | Get current user info                   |

## ✅ Validation Actuelle

Validation du lot Prospect2000 avant ouverture de la vague post-audit :

```bash
cd api/Api && dotnet build
cd api/Api.Tests && dotnet test
cd frontend && npm run lint
cd frontend && npm run build
```

Recette transverse validee : clients -> depenses -> revenus -> campagnes -> dashboard.

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=templatedb
POSTGRES_PORT=5433
JWT_SECRET=your_jwt_secret_minimum_32_chars
```

### API (appsettings.json)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5433;Database=templatedb;..."
  },
  "Jwt": {
    "Secret": "${JWT_SECRET}",
    "Issuer": "https://localhost",
    "Audience": "https://localhost",
    "ExpiryMinutes": 60
  }
}
```

### Angular Proxy (proxy.conf.json)

```json
{
  "/api": {
    "target": "http://localhost:5093",
    "secure": false,
    "changeOrigin": true
  }
}
```

## 🐳 Docker

**Build and run:**

```bash
docker-compose up --build
```

**Stop services:**

```bash
docker-compose down
```

**Remove volumes (reset database):**

```bash
docker-compose down -v
```

**Reset the local PostgreSQL volume and reapply migrations:**

```bash
./scripts/db-reset.sh
```

If `dotnet ef database update` fails with `must be owner of table Users`, the CLI is usually hitting another PostgreSQL instance on `localhost:5432`. The local Docker workflow in this repo now uses `localhost:5433` by default; use `./scripts/db-reset.sh` to recreate the Docker database on that port before re-running the API.

## 🔐 Audit Et Step Up

Le rapport d'audit ouvre une vague de remediations priorisees pour passer d'un lot fonctionnel a un depot plus robuste et industrialisable.

Priorites immediates :

1. durcir l'auth backend, la gestion de session et le cycle de vie des tokens ;
2. supprimer les vecteurs critiques cote frontend comme l'open redirect et le stockage de jetons en Web Storage ;
3. verrouiller l'isolation des donnees, le transport HTTP, Docker et la configuration ;
4. renforcer CI/CD, scans de securite et couverture de tests sur auth, RBAC et multi-tenant.

Les user stories de cette vague sont maintenues dans [.github/tasks/Prospect2000-User-Stories.md](.github/tasks/Prospect2000-User-Stories.md) et leur execution dans [.github/tasks/Prospect2000-Execution-Tracker.md](.github/tasks/Prospect2000-Execution-Tracker.md).

## 🗺️ Vague Post-Audit

Vague F et G ouvertes apres US-014 :

- securite backend auth, tokens et isolation de donnees ;
- session frontend, redirects, 401 et robustesse UX ;
- hardening Docker, configuration et pipeline CI/CD ;
- couverture de tests et readiness de production.

## 📝 Adding Features

### Add a new API endpoint

1. Create a controller in `api/Api/Controllers/`
2. Add your DbContext entities in `api/Api/Data/AppDbContext.cs`
3. Create and apply migrations

### Add an Angular component

1. Generate with: `ng generate component features/your-component`
2. Add routes in `frontend/src/app/app.routes.ts`

## 🧪 Tech Stack

| Layer     | Technology | Version |
| --------- | ---------- | ------- |
| Backend   | .NET       | 10.0    |
| Frontend  | Angular    | 19.x    |
| Database  | PostgreSQL | 15      |
| Container | Docker     | 20+     |

## 📄 License

MIT
