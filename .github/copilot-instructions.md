# Repository Instructions for GitHub Copilot

This repository is a full-stack template with a .NET 10 Web API backend, an Angular 19 frontend, PostgreSQL, Docker, JWT-based authentication, and GitHub Actions CI. Prefer small, targeted changes that follow the existing architecture and naming patterns instead of introducing new abstractions.

## Project Layout

- Backend API code lives in `api/Api`.
- API controllers are in `api/Api/Controllers`.
- Business logic and external service integrations are in `api/Api/Services`.
- DTOs are in `api/Api/Models/DTOs` and entities are in `api/Api/Models/Entities`.
- Dependency injection registration is centralized in `api/Api/Extensions/ServiceCollectionExtensions.cs`.
- EF Core context is in `api/Api/Data/AppDbContext.cs` and migrations are in `api/Api/Migrations`.
- Backend integration tests are in `api/Api.Tests`.
- Frontend application code lives in `frontend/src/app`.
- Global Angular routing is in `frontend/src/app/app.routes.ts`.
- Shared singleton frontend concerns are under `frontend/src/app/core`.
- Reusable UI belongs in `frontend/src/app/shared`.
- End-user features belong in `frontend/src/app/features`.

## Backend Conventions

- Follow the layered structure: controllers call services; keep business logic out of controllers.
- Use PascalCase for C# classes, methods, and properties.
- Keep interface-driven services with the `I` prefix, such as `IAuthService`.
- Use the `Async` suffix for asynchronous methods and prefer async I/O throughout the backend.
- Keep API routes under `/api/v1/...` and match the existing controller style.
- Register new services through `ServiceCollectionExtensions.cs` instead of adding ad hoc registrations in `Program.cs`.
- Prefer `ProblemDetails`-style error responses and preserve the existing exception-handling pipeline.
- Reuse existing DTO and entity patterns instead of inventing new response wrappers.
- Preserve JWT, rate-limiting, and authorization patterns already configured in `Program.cs` and the controllers.

## Frontend Conventions

- Use Angular standalone components and existing lazy-loaded route patterns.
- Add routes through `frontend/src/app/app.routes.ts` using `loadComponent` when adding new feature entry points.
- Prefer Angular signals for local reactive state and derived state.
- Keep TypeScript files, Angular feature folders, and component files in kebab-case.
- Keep Angular component selectors in the existing `app-...` kebab-case style.
- Reuse existing guards, interceptors, and root-provided services before introducing new cross-cutting utilities.
- Keep feature-specific code under `features`, shared UI under `shared`, and application-wide logic under `core`.
- Match the existing frontend formatting conventions: single quotes, semicolons, 2-space indentation, and a 100-character print width.

## Change Routing

- For API behavior changes, inspect controllers, services, DTOs, entities, and DI registration together.
- For authentication work, check both backend auth services/controllers and frontend auth services, guards, and interceptors.
- For UI or navigation changes, inspect `app.routes.ts`, the relevant feature directory, and any shared components used there.
- For database changes, update the entity model first, then create and review an EF Core migration.

## Build and Validation

- Backend local run: `cd api/Api && dotnet run`
- Backend build: `cd api/Api && dotnet build`
- Backend tests: `cd api/Api.Tests && dotnet test`
- Frontend install: `cd frontend && npm install`
- Frontend dev server: `cd frontend && npm start`
- Frontend lint: `cd frontend && npm run lint`
- Frontend tests: `cd frontend && npm run test -- --watch=false --browsers=ChromeHeadless`
- Frontend production build: `cd frontend && npm run build`
- Database migration creation: `./scripts/db-add-migration.sh <MigrationName>`
- Database migration apply: `./scripts/db-update.sh`
- Local PostgreSQL only: `docker-compose up db -d`

## CI Expectations

- GitHub Actions validates the backend with restore, build, and tests.
- GitHub Actions validates the frontend with `npm ci`, lint, headless tests, and production build.
- Docker image build and Trivy security scanning are also part of CI.
- Before considering a change complete, run the smallest relevant validation steps locally for the area you changed.

## Working Rules

- Keep edits minimal and consistent with the current codebase.
- Do not rewrite unrelated files, rename broad areas, or introduce new frameworks without a clear repository need.
- Update tests when behavior changes and update documentation when developer workflows or public behavior change.
- Prefer existing project scripts and documented commands over ad hoc alternatives.
- Trust this instruction file first for repo structure and workflow; only search broadly when the instructions are incomplete or contradicted by the code.
