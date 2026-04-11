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
| US-002 | API Clients/Tags | Terminé | US-001 | US-003, US-004, US-005 | Backend CRUD Implementation Agent | CRUD clients/tags fiable + doublons et isolation par utilisateur validés |
| US-003 | API Dépenses/Revenus | Terminé | US-001 | US-002, US-004, US-005 | Backend CRUD Implementation Agent | CRUD dépenses/revenus fiable + relations nullables sécurisées |
| US-004 | API Campagnes/Dashboard | Terminé | US-001 | US-002, US-003, US-005 | Backend Dashboard Implementation Agent | Campagnes validées par utilisateur + statuts/dates cohérents + dashboard summary/overview vide cohérent |
| US-005 | Tests backend | Terminé | US-002, US-003, US-004 | Peut démarrer en anticipation | Backend Integration Test Agent | Couverture d'intégration renforcée sur tags, dépenses, revenus, campagnes et dashboard avec factory existante reproductible |
| US-006 | Services Angular | Terminé | US-002, US-003, US-004 | US-007 | Frontend Services Implementation Agent | Services Angular typés pour clients, tags, dépenses, revenus, campagnes et dashboard |
| US-007 | Navigation shell | Terminé | US-006 | US-008, US-009, US-010, US-011 | Frontend CRUD UI Implementation Agent | Navigation métier accessible avec shell protégé et routes lazy-loaded |
| US-008 | Ecran Clients | Terminé | US-006 | US-009, US-010, US-011, US-012 | Frontend CRUD UI Implementation Agent | CRUD clients en UI avec creation, edition, suppression, refresh immediat et erreurs lisibles |
| US-009 | Ecran Dépenses | Terminé | US-006 | US-008, US-010, US-011 | Frontend CRUD UI Implementation Agent | CRUD depenses en UI avec tri par date, validation formulaire, tag facultatif et suppression |
| US-010 | Ecran Revenus | Terminé | US-006 | US-008, US-009, US-011 | Frontend CRUD UI Implementation Agent | CRUD revenus en UI avec client/tag facultatifs, edition/suppression et affichage coherent des relations |
| US-011 | Ecran Campagnes | Terminé | US-006, US-008 | US-009, US-010, US-012 | Frontend CRUD UI Implementation Agent | CRUD campagnes en UI avec client obligatoire, statut metier editable, budget/dates valides et etats vides lisibles |
| US-012 | Tag autocomplete | Terminé | US-002, US-006 | US-008, US-009, US-010, US-011 | Frontend CRUD UI Implementation Agent | Composant shared de selection/autocomplete de tags avec creation inline, rafraichissement immediat et isolation stricte Expense/Revenue |
| US-013 | Dashboard frontend | Terminé | US-004, US-006 | Fin de vague UI | Frontend Dashboard Implementation Agent | Dashboard métier exploitable avec KPIs financiers, tendance mensuelle, campagnes actives, clients récents et états vides responsives |
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
| T1 | US-002 terminée | `dotnet test api/Api.Tests/Api.Tests.csproj` + tests manuels clients/tags | CRUD Clients/Tags fiable | Validé |
| T2 | US-003 terminée | `dotnet test api/Api.Tests/Api.Tests.csproj` + tests manuels dépenses/revenus | CRUD financier fiable | Automatisé OK, tests manuels restants |
| T3 | US-004 terminée | `dotnet test api/Api.Tests/Api.Tests.csproj` + appel `dashboard/summary` et `dashboard/overview` | Agrégats dashboard cohérents | Validé |
| T4 | US-005 terminée | `dotnet test api/Api.Tests/Api.Tests.csproj` | Suite backend renforcée verte | Terminé le 2026-04-11 |
| T5 | US-006 terminée | `cd frontend && npm run build` | Services Angular compilent sans erreur | Terminé le 2026-04-11 |
| T6 | US-007 terminée | navigation manuelle après login | accès aux modules sans URL manuelle | Terminé le 2026-04-11 |
| T7 | US-008 à US-012 terminées progressivement | test manuel CRUD de chaque module | écrans métier exploitables | US-008, US-009, US-010, US-011 et US-012 livres le 2026-04-11, recette manuelle clients/depenses/revenus/campagnes + tag autocomplete shared faisable |
| T8 | US-013 terminée | `cd frontend && npm run build` + validation visuelle dashboard | dashboard métier lisible et cohérent | Terminé le 2026-04-11 |
| T9 | US-014 terminée | `cd api/Api && dotnet build`, `dotnet test api/Api.Tests/Api.Tests.csproj`, `cd frontend && npm run lint`, `cd frontend && npm run build` | projet livrable au niveau prévu | À mettre à jour |

---

## Testable maintenant

- Socle confirmé : le modèle de données Prospect 2000 existe déjà et les tests backend actuels passent.
- US-002 terminée : API Clients/Tags testable côté backend avec CRUD complet, isolement strict par `UserId`, filtrage tags par catégorie, validations cohérentes et erreurs 400/404/409 propres.
- US-003 terminée : API Dépenses/Revenus testable côté backend avec CRUD complet, sérialisation `decimal` et `DateOnly`, PATCH avec remise explicite à `null`, et isolation stricte par `UserId`.
- US-004 terminé : création et mise à jour des campagnes refusent un client d'un autre utilisateur, refusent les dates incohérentes et exposent les statuts de campagne en chaîne pour le contrat Angular.
- Dashboard métier testable côté API : `GET /api/v1/dashboard/summary` et `GET /api/v1/dashboard/overview` renvoient des agrégats cohérents, y compris sans aucune donnée.
- US-005 terminé : la suite d'intégration backend couvre désormais un happy path et au moins un garde-fou pour Tags, Expenses, Revenues, Campaigns et Dashboard, sans changement de factory requis.
- US-006 terminé : une couche de services Angular root-provided typée existe désormais pour clients, tags, dépenses, revenus, campagnes et dashboard.
- US-007 terminé : un shell Angular protégé par `authGuard` expose les entrées `/dashboard`, `/clients`, `/expenses`, `/revenues` et `/campaigns` via une navigation partagée desktop/mobile sans saisie d'URL.
- US-008 terminee : l'ecran Clients permet maintenant creation, edition et suppression avec resynchronisation immediate de la liste et message comprehensible sur les erreurs bloquantes, y compris le doublon d'e-mail.
- US-009 terminee : l'ecran depenses permet creation, edition, suppression, tri par date, affichage coherent montant/date et usage correct avec ou sans tags charges.
- US-010 terminee : l'ecran revenus permet creation, edition et suppression avec client/tag facultatifs, messages clairs quand aucune relation n'existe et affichage fiable des champs lies dans la liste.
- US-011 terminee : l'ecran campagnes permet creation, edition, suppression, selection obligatoire d'un client valide, edition du statut metier et controle lisible de coherence sur budget et dates.
- US-012 terminee : un composant shared standalone de tag autocomplete charge les tags par categorie, permet la creation inline avec rafraichissement immediat et est deja branche en demonstration minimale sur depenses et revenus sans melanger Expense et Revenue.
- US-013 terminee : le dashboard frontend consomme maintenant l'overview reel pour afficher KPIs revenus/depenses/benefice/clients, tendance mensuelle, campagnes actives, clients recents, erreurs lisibles et etats vides coherents en desktop/mobile.

---

## Dernière mise à jour

- 2026-04-11 - US-002 terminée - testable maintenant : API clients/tags fiabilisée avec unicité exposée proprement, filtrage tags par utilisateur/catégorie et isolation stricte par utilisateur débloquée pour le frontend et les tests backend.
- 2026-04-11 - US-003 terminée - testable maintenant : API dépenses/revenus fiabilisée avec validations de propriété sur tags/clients, relations nullables sûres et couverture d'intégration dédiée.
- 2026-04-11 - US-005 terminée - testable maintenant : suite d'intégration backend renforcée sur tags, dépenses, revenus, campagnes et dashboard; T4 validé et recette backend reproductible avec la factory existante.
- 2026-04-11 - US-006 terminée - testable maintenant : services Angular métier compilables pour clients, tags, dépenses, revenus, campagnes et dashboard; navigation shell et écrans CRUD/dashboard débloqués.
- 2026-04-11 - US-007 terminée - testable maintenant : shell métier protégé, navigation partagée responsive et routes lazy-loaded dashboard/clients/expenses/revenues/campaigns débloquées pour les écrans UI des US-008 à US-011.
- 2026-04-11 - US-008 terminee - testable maintenant : ecran Clients exploitable en CRUD avec liste, creation, edition, suppression, rafraichissement immediat apres action et message lisible sur doublon d'e-mail.
- 2026-04-11 - US-009 terminee - testable maintenant : ecran depenses exploitable en CRUD avec tri par date, validation de formulaire, tags facultatifs et affichage fiable des montants/dates.
- 2026-04-11 - US-010 terminee - testable maintenant : ecran revenus exploitable en CRUD avec client/tag facultatifs, edition/suppression, etats vides explicites et affichage coherent des relations client/tag.
- 2026-04-11 - US-011 terminee - testable maintenant : ecran campagnes exploitable en CRUD avec client obligatoire, statuts Draft/Active/Completed/Cancelled editables, validation budget/dates lisible et build Angular valide.
- 2026-04-11 - US-012 terminee - testable maintenant : composant shared de tag autocomplete livre avec filtrage strict par categorie, creation inline suivie d'un rechargement immediat et branchement minimal de preuve sur depenses/revenus.
- 2026-04-11 - US-013 terminee - testable maintenant : dashboard metier avec KPIs financiers, graphique revenus vs depenses sur 12 mois glissants, widgets campagnes actives/clients recents, etats vides lisibles et rendu responsive compilable.