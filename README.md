# Full-Stack Template

A minimal full-stack template with:
- **Backend**: .NET 10 Web API with PostgreSQL
- **Frontend**: Angular 17 with standalone components
- **Database**: PostgreSQL 15
- **Containerization**: Docker & Docker Compose

## 📁 Project Structure

```
templateFullStack/
├── api/
│   └── Api/              # .NET 10 Web API
├── frontend/             # Angular 17 application
├── docker-compose.yml    # Container orchestration
├── Dockerfile            # Multi-stage build
└── README.md
```

## 🚀 Quick Start

### Option 1: Docker (Production-like)

```bash
# Start all services
docker-compose up --build

# Access the app at http://localhost:8080
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

**Start the API:**
```bash
cd api/Api
dotnet run
# API runs on http://localhost:5000
```

**Start Angular (separate terminal):**
```bash
cd frontend
npm install
npm start
# Frontend runs on http://localhost:4200
```

## 🔗 Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check with database connectivity |

## ⚙️ Configuration

### API (appsettings.json)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=templatedb;Username=postgres;Password=postgres"
  },
  "Cors": {
    "AllowedOrigins": ["http://localhost:4200"]
  }
}
```

### Angular Proxy (proxy.conf.json)
```json
{
  "/api": {
    "target": "http://localhost:5000",
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

## 📝 Adding Features

### Add a new API endpoint
1. Create a controller in `api/Api/Controllers/`
2. Add your DbContext entities in `api/Api/Data/AppDbContext.cs`
3. Create and apply migrations

### Add an Angular component
1. Generate with: `ng generate component features/your-component`
2. Add routes in `frontend/src/app/app.routes.ts`

## 🧪 Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Backend | .NET | 10.0 |
| Frontend | Angular | 17.x |
| Database | PostgreSQL | 15 |
| Container | Docker | 20+ |

## 📄 License

MIT
