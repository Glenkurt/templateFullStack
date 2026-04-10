PRD — Prospect 2000 Dashboard
Objectif : construire un dashboard de gestion d'activité pour Prospect 2000, avec 5 modules CRUD (Clients, Tags, Dépenses, Revenus, Campagnes) et un écran d'accueil synthétique, greffés sur le stack existant (.NET 10 + Angular 19 + PostgreSQL).

Plan : Prospect 2000 Dashboard — Modules CRUD
TL;DR : Ajouter 5 nouvelles entités en base + leurs endpoints REST + leurs pages Angular, puis enrichir le dashboard existant avec des KPIs financiers, un graphique mensuel et les campagnes actives.

Phase 1 — Data Model (bloquant pour tout le reste)
Créer 5 entités dans Entities :

Entité Champs clés
Client FirstName, LastName, Email (unique), Phone, CompanyName, UserId
Tag Name, Category (enum Expense|Revenue), UserId
Expense Name, Amount (decimal 18,2 €), Date, TagId?, UserId
Revenue Amount, Date, TagId?, ClientId?, UserId
Campaign Title, Description, Amount, StartDate, EndDate?, Status (enum Draft|Active|Completed|Cancelled), ClientId, UserId
Mettre à jour AppDbContext.cs — 5 nouveaux DbSet<>, relations FK, index sur UserId

Créer la migration EF Core via .db-add-migration.sh ProspectCrudModels

Phase 2 — Backend Services & Controllers (étapes 4–7 parallèles entre elles, dépendent de Phase 1)
Créer les DTOs dans DTOs (sous-dossiers Client/, Tag/, Expense/, Revenue/, Campaign/, Dashboard/) — pattern existant : CreateXxxRequest, XxxDto
Créer 6 interfaces + implémentations dans Services (IClientService / ClientService, même chose pour Tag, Expense, Revenue, Campaign, Dashboard)
Créer 6 contrôleurs dans Controllers — routes /api/v1/clients, /api/v1/tags, /api/v1/expenses, /api/v1/revenues, /api/v1/campaigns, /api/v1/dashboard — pattern [Authorize] existant
Enregistrer les 6 services dans ServiceCollectionExtensions.cs
Ajouter des tests d'intégration dans Api.Tests pour les endpoints clients et dashboard summary (parallèle avec Phase 3)
Phase 3 — Frontend Services (dépend de Phase 2)
Créer les services Angular (injection root) dans services : client.service.ts, tag.service.ts, expense.service.ts, revenue.service.ts, campaign.service.ts, dashboard.service.ts
Créer un composant réutilisable TagAutocompleteComponent dans shared — chargement de la liste par catégorie + saisie libre pour créer un nouveau tag à la volée
Phase 4 — Pages CRUD & Navigation (parallèle avec Phase 5)
Créer 4 dossiers dans features : clients/, expenses/, revenues/, campaigns/ — chacun avec un composant liste + formulaire (modal ou inline)
Ajouter 4 routes lazy-loaded dans app.routes.ts avec authGuard :
/clients, /expenses, /revenues, /campaigns
Ajouter une sidebar/nav dans shared ou core/ pour accéder à tous les modules
Phase 5 — Dashboard enrichi (dépend de Phase 3, parallèle avec Phase 4)
Mettre à jour features/dashboard/dashboard.component.ts avec :
Cards KPI : Total Revenus, Total Dépenses, Bénéfice net, Nombre de clients
Graphique mensuel (12 derniers mois, courbes revenus vs dépenses) via Chart.js (ng2-charts)
Campagnes actives (statut Active)
Liste clients récents
Fichiers impactés
Entities — 5 nouveaux fichiers
AppDbContext.cs — DbSets + relations
ServiceCollectionExtensions.cs — enregistrement des services
Controllers — 6 nouveaux fichiers
Services — 12 nouveaux fichiers (interfaces + implémentations)
DTOs — 6 sous-dossiers
app.routes.ts — 4 nouvelles routes
features — 4 nouveaux dossiers
services — 6 nouveaux fichiers
shared — TagAutocompleteComponent + sidebar
Vérification
cd api/Api && dotnet build — 0 erreur de compilation
cd Api.Tests && dotnet test — tous les tests verts
cd frontend && npm run lint — 0 erreur ESLint
cd frontend && npm run test -- --watch=false --browsers=ChromeHeadless — tests Karma verts
Test manuel CRUD complet sur chaque entité (créer, lire, modifier, supprimer)
Test manuel dashboard : KPIs corrects, graphique mensuel visible, campagnes actives affichées
Décisions
Entités liées à UserId (pattern existant) — future-proof même si solo aujourd'hui
Tags créés inline via autocomplete, pas de page dédiée
Expense et Revenue ont un champ Date (non demandé explicitement mais requis pour les graphiques mensuels)
Revenue et Campaign sont indépendants (pas de FK entre les deux)
Filtres et export hors scope v1
