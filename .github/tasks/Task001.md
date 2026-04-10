# Task001 — Phase 1 : Data Model

## User Story

**En tant que** développeur backend,
**je veux** créer les 5 nouvelles entités EF Core (`Client`, `Tag`, `Expense`, `Revenue`, `Campaign`) et mettre à jour le contexte de base de données,
**afin que** le schéma PostgreSQL soit prêt à accueillir les données métier de Prospect 2000 et que toutes les phases suivantes puissent s'appuyer sur un modèle stable.

---

## Contexte

Cette phase est **bloquante** pour l'ensemble du projet : aucune couche service, contrôleur ou page Angular ne peut être construite sans que le modèle de données soit en place et migré.

Le projet utilise déjà :
- EF Core avec `AppDbContext` (`api/Api/Data/AppDbContext.cs`)
- Le pattern `UserId` (FK vers `ApplicationUser`) pour isoler les données par utilisateur
- Le script `./scripts/db-add-migration.sh <NomMigration>` pour générer les migrations

---

## Critères d'acceptation

### 1. Entité `Client`

- [ ] Fichier créé : `api/Api/Models/Entities/Client.cs`
- [ ] Propriétés : `Id` (Guid), `FirstName` (string), `LastName` (string), `Email` (string, unique par utilisateur), `Phone` (string?), `CompanyName` (string?), `UserId` (Guid, FK), `CreatedAt` (DateTimeOffset)
- [ ] Relation : `ApplicationUser` via `UserId`

### 2. Entité `Tag`

- [ ] Fichier créé : `api/Api/Models/Entities/Tag.cs`
- [ ] Propriétés : `Id` (Guid), `Name` (string), `Category` (enum `TagCategory` : `Expense` | `Revenue`), `UserId` (Guid, FK), `CreatedAt` (DateTimeOffset)
- [ ] Enum `TagCategory` défini dans le même fichier ou dans un fichier dédié `Enums/TagCategory.cs`
- [ ] Relation : `ApplicationUser` via `UserId`

### 3. Entité `Expense`

- [ ] Fichier créé : `api/Api/Models/Entities/Expense.cs`
- [ ] Propriétés : `Id` (Guid), `Name` (string), `Amount` (decimal, précision 18,2), `Date` (DateOnly), `TagId` (Guid?, FK nullable), `UserId` (Guid, FK), `CreatedAt` (DateTimeOffset)
- [ ] Relations : `Tag` (nullable) et `ApplicationUser` via leurs FK respectives

### 4. Entité `Revenue`

- [ ] Fichier créé : `api/Api/Models/Entities/Revenue.cs`
- [ ] Propriétés : `Id` (Guid), `Amount` (decimal, précision 18,2), `Date` (DateOnly), `TagId` (Guid?, FK nullable), `ClientId` (Guid?, FK nullable), `UserId` (Guid, FK), `CreatedAt` (DateTimeOffset)
- [ ] Relations : `Tag` (nullable), `Client` (nullable), `ApplicationUser`

### 5. Entité `Campaign`

- [ ] Fichier créé : `api/Api/Models/Entities/Campaign.cs`
- [ ] Propriétés : `Id` (Guid), `Title` (string), `Description` (string?), `Amount` (decimal, précision 18,2), `StartDate` (DateOnly), `EndDate` (DateOnly?), `Status` (enum `CampaignStatus` : `Draft` | `Active` | `Completed` | `Cancelled`), `ClientId` (Guid, FK), `UserId` (Guid, FK), `CreatedAt` (DateTimeOffset)
- [ ] Enum `CampaignStatus` défini dans le même fichier ou dans un fichier dédié `Enums/CampaignStatus.cs`
- [ ] Relations : `Client` et `ApplicationUser`

### 6. Mise à jour de `AppDbContext`

- [ ] 5 nouveaux `DbSet<>` ajoutés : `Clients`, `Tags`, `Expenses`, `Revenues`, `Campaigns`
- [ ] Configuration Fluent API dans `OnModelCreating` :
  - Index unique sur `(Email, UserId)` pour `Client`
  - Index sur `UserId` pour chacune des 5 entités
  - Précision `decimal(18,2)` configurée sur tous les champs `Amount`
  - FK avec comportement `Restrict` ou `NoAction` (pas de cascade delete sur les entités utilisateur)
- [ ] Aucune régression sur les entités existantes (`ApplicationUser`, `RefreshToken`, `PasswordResetToken`, `Subscription`)

### 7. Migration EF Core

- [ ] Migration générée via `./scripts/db-add-migration.sh ProspectCrudModels`
- [ ] Fichier de migration présent dans `api/Api/Migrations/`
- [ ] Migration reviewée manuellement : colonnes et contraintes cohérentes avec les entités
- [ ] `dotnet build` dans `api/Api` retourne **0 erreur**

---

## Tâches techniques

| # | Action | Fichier(s) concerné(s) |
|---|--------|------------------------|
| 1 | Créer `Client.cs` | `api/Api/Models/Entities/Client.cs` |
| 2 | Créer `Tag.cs` + enum `TagCategory` | `api/Api/Models/Entities/Tag.cs` |
| 3 | Créer `Expense.cs` | `api/Api/Models/Entities/Expense.cs` |
| 4 | Créer `Revenue.cs` | `api/Api/Models/Entities/Revenue.cs` |
| 5 | Créer `Campaign.cs` + enum `CampaignStatus` | `api/Api/Models/Entities/Campaign.cs` |
| 6 | Mettre à jour `AppDbContext.cs` | `api/Api/Data/AppDbContext.cs` |
| 7 | Générer la migration | `./scripts/db-add-migration.sh ProspectCrudModels` |
| 8 | Vérifier le build | `cd api/Api && dotnet build` |

---

## Définition of Done

- [ ] Les 5 entités compilent sans erreur ni avertissement
- [ ] `AppDbContext` expose les 5 `DbSet<>` correctement configurés
- [ ] La migration `ProspectCrudModels` est générée et présente dans `api/Api/Migrations/`
- [ ] `dotnet build` retourne **0 erreur**
- [ ] Aucun test existant dans `api/Api.Tests` n'est cassé (`dotnet test`)

---

## Hors scope

- Création des DTOs (Task002)
- Création des services et contrôleurs (Task003+)
- Pages Angular (Task004+)
- Filtres, pagination, export
