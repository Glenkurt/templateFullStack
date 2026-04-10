# Prospect 2000 — Execution Tracker

Ce document sert de tableau de coordination partagé entre agents. Toute fin de tâche doit se traduire ici par une mise à jour du statut, des dépendances restantes et de la section `Testable maintenant`.

## Mode d'emploi pour les agents

À la fin d'une tâche, mettre à jour les éléments suivants :

1. la ligne de l'US dans le tableau principal ;
2. la ligne du jalon de test correspondant ;
3. la note `Dernière mise à jour` avec la date et ce qui a été réellement débloqué.

Format de note recommandé : `YYYY-MM-DD - Agent/lot terminé - testable maintenant : ...`

---

## Vue globale

| US | Domaine | Statut | Dépend de | Parallèle | Agent recommandé | Testable maintenant |
| --- | --- | --- | --- | --- | --- | --- |
| US-001 | Data model | Terminé | - | - | Backend CRUD Implementation Agent | Base de données stable et build backend |
| US-002 | API Clients/Tags | À faire | US-001 | US-003, US-004, US-005 | Backend CRUD Implementation Agent | CRUD clients/tags + contrôle doublon email |
| US-003 | API Dépenses/Revenus | À faire | US-001 | US-002, US-004, US-005 | Backend CRUD Implementation Agent | CRUD dépenses/revenus + relations nullables |
| US-004 | API Campagnes/Dashboard | À faire | US-001 | US-002, US-003, US-005 | Backend Dashboard Implementation Agent | CRUD campagnes + endpoints dashboard |
| US-005 | Tests backend | À faire | US-002, US-003, US-004 | Peut démarrer en anticipation | Backend Integration Test Agent | Suite `dotnet test` enrichie |
| US-006 | Services Angular | À faire | US-002, US-003, US-004 | US-007 | Frontend Services Implementation Agent | Base frontend typée pour tous les modules |
| US-007 | Navigation shell | À faire | US-006 | US-008, US-009, US-010, US-011 | Frontend CRUD UI Implementation Agent | Navigation métier accessible |
| US-008 | Ecran Clients | À faire | US-006 | US-009, US-010, US-011, US-012 | Frontend CRUD UI Implementation Agent | CRUD clients en UI |
| US-009 | Ecran Dépenses | À faire | US-006 | US-008, US-010, US-011 | Frontend CRUD UI Implementation Agent | CRUD dépenses en UI |
| US-010 | Ecran Revenus | À faire | US-006 | US-008, US-009, US-011 | Frontend CRUD UI Implementation Agent | CRUD revenus en UI |
| US-011 | Ecran Campagnes | À faire | US-006, US-008 | US-009, US-010, US-012 | Frontend CRUD UI Implementation Agent | CRUD campagnes en UI |
| US-012 | Tag autocomplete | À faire | US-002, US-006 | US-008, US-009, US-010, US-011 | Frontend CRUD UI Implementation Agent | Sélection/création inline des tags |
| US-013 | Dashboard frontend | À faire | US-004, US-006 | Fin de vague UI | Frontend Dashboard Implementation Agent | KPIs, graphique, campagnes actives, clients récents |
| US-014 | Stabilisation finale | À faire | US-005 à US-013 | - | Project Tracker Steward + QA Readiness Story Agent | Recette globale prête |

---

## Vagues d'exécution parallèles

### Vague A — Stabilisation backend

| Lane | US | Objectif |
| --- | --- | --- |
| A1 | US-002 | Clients et Tags |
| A2 | US-003 | Dépenses et Revenus |
| A3 | US-004 | Campagnes et Dashboard |
| A4 | US-005 | Renforcement de la couverture de tests backend |

Sortie attendue : backend CRUD et dashboard suffisamment stables pour servir de contrat au frontend.

### Vague B — Fondation frontend

| Lane | US | Objectif |
| --- | --- | --- |
| B1 | US-006 | Services Angular métier |
| B2 | US-007 | Routes et navigation métier |

Sortie attendue : application Angular prête à recevoir plusieurs écrans en parallèle.

### Vague C — Ecrans CRUD

| Lane | US | Objectif |
| --- | --- | --- |
| C1 | US-008 | Module Clients |
| C2 | US-009 | Module Dépenses |
| C3 | US-010 | Module Revenus |
| C4 | US-011 | Module Campagnes |
| C5 | US-012 | Composant partagé Tags |

Sortie attendue : modules métier exploitables indépendamment, puis intégration homogène.

### Vague D — Dashboard métier

| Lane | US | Objectif |
| --- | --- | --- |
| D1 | US-013 | Dashboard enrichi |

Sortie attendue : vue synthétique basée sur les données réelles des modules CRUD.

### Vague E — Recette finale

| Lane | US | Objectif |
| --- | --- | --- |
| E1 | US-014 | Stabilisation et recette transverse |

---

## Jalons de test

| Jalon | Déclencheur | Commandes / scénarios | Résultat attendu | Statut |
| --- | --- | --- | --- | --- |
| T1 | US-002 terminée | `dotnet test api/Api.Tests/Api.Tests.csproj` + tests manuels clients/tags | CRUD Clients/Tags fiable | À mettre à jour |
| T2 | US-003 terminée | `dotnet test api/Api.Tests/Api.Tests.csproj` + tests manuels dépenses/revenus | CRUD financier fiable | À mettre à jour |
| T3 | US-004 terminée | `dotnet test api/Api.Tests/Api.Tests.csproj` + appel `dashboard/summary` et `dashboard/overview` | Agrégats dashboard cohérents | À mettre à jour |
| T4 | US-005 terminée | `dotnet test api/Api.Tests/Api.Tests.csproj` | Suite backend renforcée verte | À mettre à jour |
| T5 | US-006 terminée | `cd frontend && npm run build` | Services Angular compilent sans erreur | À mettre à jour |
| T6 | US-007 terminée | navigation manuelle après login | accès aux modules sans URL manuelle | À mettre à jour |
| T7 | US-008 à US-012 terminées progressivement | test manuel CRUD de chaque module | écrans métier exploitables | À mettre à jour |
| T8 | US-013 terminée | `cd frontend && npm run build` + validation visuelle dashboard | dashboard métier lisible et cohérent | À mettre à jour |
| T9 | US-014 terminée | `cd api/Api && dotnet build`, `dotnet test api/Api.Tests/Api.Tests.csproj`, `cd frontend && npm run lint`, `cd frontend && npm run build` | projet livrable au niveau prévu | À mettre à jour |

---

## Testable maintenant

- Socle confirmé : le modèle de données Prospect 2000 existe déjà et les tests backend actuels passent.
- Tant que US-002 à US-004 ne sont pas explicitement clôturées, considérer le backend comme `présent mais à fiabiliser`.
- Le frontend métier n'est pas encore testable fonctionnellement au-delà des écrans génériques déjà présents.

---

## Dernière mise à jour

- 2026-04-11 - Initialisation du tracker - testable maintenant : socle de données + tests backend existants.