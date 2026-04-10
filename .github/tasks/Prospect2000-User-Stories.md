# Prospect 2000 — Backlog détaillé des user stories

Ce fichier est la source de vérité fonctionnelle pour exécuter le projet avec plusieurs agents. Il part de l'état réel du dépôt au 11 avril 2026 : le modèle de données est livré, le backend CRUD est déjà largement présent, et le plus gros du travail restant se concentre sur la stabilisation backend, la couverture de tests, les services Angular, les écrans CRUD et le dashboard métier.

## Règles de lecture

- `Statut` décrit l'état attendu du lot dans le backlog, pas forcément son implémentation complète dans le code.
- `Parallèle` indique les autres US qui peuvent être menées en même temps sans blocage structurel.
- `Testable à la fin` liste ce qui devient vérifiable dès que l'US est terminée.

---

## US-001 — Socle de données Prospect 2000

- `Statut` : Terminé
- `Phase` : 1
- `User story` : En tant que développeur backend, je veux disposer d'un modèle de données EF Core stable pour les clients, tags, dépenses, revenus et campagnes afin que toutes les couches supérieures puissent s'appuyer sur un schéma cohérent.
- `Périmètre` : entités EF Core, `AppDbContext`, migration `ProspectCrudModels`.
- `Dépendances` : aucune.
- `Travaux attendus` : conserver ce socle comme base contractuelle pour tous les travaux backend et frontend à venir.
- `Critères d'acceptation` : la migration existe, le build backend passe, les entités sont liées à `UserId` et les montants sont configurés en `decimal(18,2)`.
- `Testable à la fin` : build backend, migration revue, endpoints backend pouvant ensuite être branchés sur ces tables.

## US-002 — Finaliser et fiabiliser l'API Clients et Tags

- `Statut` : À exécuter / vérifier
- `Phase` : 2
- `User story` : En tant qu'utilisateur authentifié, je veux gérer mes clients et mes tags métier afin de structurer mon activité sans mélanger les données d'autres utilisateurs.
- `Périmètre` : contrôleurs, services, DTOs et règles métier pour `Client` et `Tag`.
- `Dépendances` : US-001.
- `Parallèle` : US-003, US-004, US-005.
- `Travaux attendus` :
  - vérifier que tous les endpoints CRUD existent et respectent le pattern `/api/v1/...`;
  - garantir l'isolation par `UserId` sur lecture, modification et suppression;
  - confirmer les validations minimales côté API pour l'email client et la catégorie de tag;
  - documenter les cas d'erreur attendus : ressource absente, doublon, payload invalide.
- `Critères d'acceptation` :
  - un utilisateur authentifié peut créer, lire, modifier et supprimer ses clients;
  - l'unicité `(Email, UserId)` est respectée et exposée proprement côté API;
  - les tags sont filtrés par utilisateur et par catégorie exploitable côté frontend;
  - aucun endpoint ne permet d'accéder à des données appartenant à un autre utilisateur.
- `Zones de code visées` : `api/Api/Controllers/ClientsController.cs`, `api/Api/Controllers/TagsController.cs`, `api/Api/Services/`, `api/Api/Models/DTOs/Client/`, `api/Api/Models/DTOs/Tag/`.
- `Testable à la fin` : tests d'intégration clients/tags, appels Postman CRUD, validation du doublon d'email, filtrage par utilisateur.

## US-003 — Finaliser et fiabiliser l'API Dépenses et Revenus

- `Statut` : À exécuter / vérifier
- `Phase` : 2
- `User story` : En tant qu'utilisateur authentifié, je veux enregistrer mes dépenses et mes revenus pour suivre mon activité financière et préparer les indicateurs du dashboard.
- `Périmètre` : contrôleurs, services, DTOs et règles métier pour `Expense` et `Revenue`.
- `Dépendances` : US-001.
- `Parallèle` : US-002, US-004, US-005.
- `Travaux attendus` :
  - valider les opérations CRUD complètes pour les deux domaines;
  - sécuriser les relations optionnelles avec les tags et les clients;
  - confirmer la précision et la sérialisation des montants et des dates;
  - prévoir des réponses cohérentes si un tag ou un client référencé n'appartient pas à l'utilisateur.
- `Critères d'acceptation` :
  - une dépense peut être créée avec ou sans tag;
  - un revenu peut être créé avec ou sans tag et avec ou sans client;
  - les requêtes de listing ne remontent que les données du propriétaire;
  - les montants sont cohérents entre stockage, lecture API et futur usage frontend.
- `Zones de code visées` : `api/Api/Controllers/ExpensesController.cs`, `api/Api/Controllers/RevenuesController.cs`, `api/Api/Services/`, `api/Api/Models/DTOs/Expense/`, `api/Api/Models/DTOs/Revenue/`.
- `Testable à la fin` : CRUD API complet dépenses/revenus, vérification des champs `DateOnly`, scénarios avec relations nullables, contrôle de sécurité multi-utilisateur.

## US-004 — Finaliser l'API Campagnes et Dashboard métier

- `Statut` : À exécuter / vérifier
- `Phase` : 2
- `User story` : En tant qu'utilisateur authentifié, je veux piloter mes campagnes et disposer de données consolidées pour le dashboard afin de visualiser l'état de mon activité.
- `Périmètre` : `Campaign`, `DashboardSummary`, `DashboardOverview`.
- `Dépendances` : US-001.
- `Parallèle` : US-002, US-003, US-005.
- `Travaux attendus` :
  - valider le CRUD campagnes avec relation obligatoire vers un client du même utilisateur;
  - confirmer la cohérence métier des statuts `Draft`, `Active`, `Completed`, `Cancelled`;
  - stabiliser les agrégats dashboard : totaux financiers, campagnes actives, clients récents, données mensuelles si prévues;
  - vérifier que les DTOs dashboard sont prêts à être consommés par Angular.
- `Critères d'acceptation` :
  - une campagne ne peut pas être liée à un client étranger à l'utilisateur;
  - les endpoints dashboard renvoient des données cohérentes même sans historique complet;
  - les contrats JSON sont stables et documentés implicitement par les DTOs;
  - les cas de liste vide sont gérés proprement.
- `Zones de code visées` : `api/Api/Controllers/CampaignsController.cs`, `api/Api/Controllers/DashboardController.cs`, `api/Api/Services/CampaignService.cs`, `api/Api/Services/DashboardService.cs`, `api/Api/Models/DTOs/Campaign/`, `api/Api/Models/DTOs/Dashboard/`.
- `Testable à la fin` : CRUD campagnes, endpoint `GET /api/v1/dashboard/summary`, endpoint `GET /api/v1/dashboard/overview`, cas sans données.

## US-005 — Étendre la couverture de tests d'intégration backend

- `Statut` : Prête
- `Phase` : 2
- `User story` : En tant que développeur backend, je veux couvrir les endpoints Prospect 2000 par des tests d'intégration afin de détecter les régressions avant de brancher le frontend.
- `Périmètre` : `api/Api.Tests`.
- `Dépendances` : US-002, US-003, US-004 peuvent être stabilisées en parallèle, mais cette US devient pleinement utile quand leurs contrats sont figés.
- `Parallèle` : peut commencer pendant US-002 à US-004.
- `Travaux attendus` :
  - compléter la couverture pour `Tags`, `Expenses`, `Revenues`, `Campaigns` et les scénarios dashboard critiques;
  - couvrir au minimum création, lecture, modification, suppression et isolation par utilisateur;
  - ajouter les scénarios d'échec significatifs : ressource absente, données invalides, accès non autorisé.
- `Critères d'acceptation` :
  - les tests existants continuent de passer;
  - chaque domaine métier Prospect possède au moins un scénario happy path et un scénario de garde-fou;
  - les tests sont reproductibles avec la factory existante.
- `Zones de code visées` : `api/Api.Tests/Integration/`.
- `Testable à la fin` : `dotnet test api/Api.Tests/Api.Tests.csproj` avec couverture significativement renforcée.

## US-006 — Créer les services Angular de domaine et leurs contrats TypeScript

- `Statut` : Prête
- `Phase` : 3
- `User story` : En tant que développeur frontend, je veux disposer de services Angular typés pour les clients, tags, dépenses, revenus, campagnes et dashboard afin de construire les écrans métier sur des contrats stables.
- `Périmètre` : services Angular root-provided, interfaces TypeScript, mapping minimal des réponses API.
- `Dépendances` : US-002, US-003, US-004.
- `Parallèle` : US-007 peut démarrer en parallèle si elle n'attend pas toute la donnée réelle.
- `Travaux attendus` :
  - créer `client.service.ts`, `tag.service.ts`, `expense.service.ts`, `revenue.service.ts`, `campaign.service.ts`, `dashboard.service.ts`;
  - définir les types nécessaires pour lister, créer, modifier et supprimer;
  - centraliser les appels HTTP vers `/api/v1/...` en cohérence avec le projet;
  - prévoir les méthodes nécessaires aux futurs écrans CRUD et au dashboard.
- `Critères d'acceptation` :
  - chaque domaine métier dispose d'un service Angular dédié;
  - les signatures exposées suffisent à alimenter les écrans prévus;
  - les erreurs HTTP remontent proprement dans la couche UI existante.
- `Zones de code visées` : `frontend/src/app/services/`, éventuellement `frontend/src/app/core/` pour types partagés si besoin.
- `Testable à la fin` : compilation Angular, appels manuels depuis les composants de test, base solide pour développer les pages.

## US-007 — Mettre en place la navigation métier et le shell d'accès aux modules

- `Statut` : Prête
- `Phase` : 4
- `User story` : En tant qu'utilisateur authentifié, je veux naviguer rapidement entre dashboard, clients, dépenses, revenus et campagnes afin d'utiliser l'application comme un véritable tableau de bord métier.
- `Périmètre` : routes Angular, navigation partagée, shell visuel minimal mais exploitable.
- `Dépendances` : US-006 pour la cible fonctionnelle des écrans; peut démarrer avec des placeholders réalistes.
- `Parallèle` : US-008, US-009, US-010, US-011.
- `Travaux attendus` :
  - ajouter les routes lazy-loaded manquantes;
  - créer ou enrichir la navigation partagée;
  - faire apparaître clairement les modules Prospect 2000 dans l'application;
  - garantir la protection par `authGuard`.
- `Critères d'acceptation` :
  - les routes `/clients`, `/expenses`, `/revenues`, `/campaigns`, `/dashboard` sont accessibles après authentification;
  - la navigation permet d'atteindre chaque module sans URL saisie à la main;
  - l'expérience reste cohérente sur desktop et mobile.
- `Zones de code visées` : `frontend/src/app/app.routes.ts`, `frontend/src/app/shared/`, `frontend/src/app/core/`.
- `Testable à la fin` : navigation manuelle entre modules, contrôle des guards, vérification de l'ergonomie globale.

## US-008 — Construire l'écran Clients

- `Statut` : Prête
- `Phase` : 4
- `User story` : En tant qu'utilisateur authentifié, je veux gérer mes clients depuis un écran dédié afin de créer et maintenir mon portefeuille de contacts.
- `Périmètre` : liste, création, édition, suppression côté Angular pour `Client`.
- `Dépendances` : US-006, idéalement US-007.
- `Parallèle` : US-009, US-010, US-011, US-012.
- `Travaux attendus` :
  - créer le feature folder `clients/`;
  - afficher une liste exploitable avec les champs clés;
  - proposer un formulaire de création et de mise à jour;
  - gérer le cas du doublon d'email et les messages de retour utilisateur.
- `Critères d'acceptation` :
  - l'utilisateur peut créer, modifier et supprimer un client depuis l'UI;
  - la liste reflète immédiatement l'état backend après action;
  - les erreurs bloquantes sont visibles et compréhensibles.
- `Zones de code visées` : `frontend/src/app/features/clients/`, `frontend/src/app/services/client.service.ts`.
- `Testable à la fin` : CRUD manuel complet clients depuis le navigateur.

## US-009 — Construire l'écran Dépenses

- `Statut` : Prête
- `Phase` : 4
- `User story` : En tant qu'utilisateur authentifié, je veux saisir et corriger mes dépenses afin de suivre mes sorties d'argent au fil du temps.
- `Périmètre` : liste, création, édition, suppression côté Angular pour `Expense`.
- `Dépendances` : US-006, idéalement US-012 pour l'expérience tag complète.
- `Parallèle` : US-008, US-010, US-011.
- `Travaux attendus` :
  - créer le feature folder `expenses/`;
  - intégrer la date, le montant et le tag optionnel;
  - gérer le rendu des montants et la validation du formulaire;
  - permettre l'édition sans rupture de flux utilisateur.
- `Critères d'acceptation` :
  - une dépense peut être créée avec ou sans tag;
  - la liste est lisible et triable au minimum par date;
  - le montant reste cohérent entre saisie et affichage.
- `Zones de code visées` : `frontend/src/app/features/expenses/`, `frontend/src/app/services/expense.service.ts`.
- `Testable à la fin` : CRUD manuel dépenses, vérification du format monétaire et des dates.

## US-010 — Construire l'écran Revenus

- `Statut` : Prête
- `Phase` : 4
- `User story` : En tant qu'utilisateur authentifié, je veux enregistrer mes revenus afin de suivre mes entrées financières et d'alimenter les indicateurs du dashboard.
- `Périmètre` : liste, création, édition, suppression côté Angular pour `Revenue`.
- `Dépendances` : US-006, idéalement US-008 et US-012 pour exploiter client et tag.
- `Parallèle` : US-008, US-009, US-011.
- `Travaux attendus` :
  - créer le feature folder `revenues/`;
  - supporter les relations optionnelles client/tag;
  - rendre explicite la date et le montant;
  - garantir une UX claire même si aucun client ou tag n'existe encore.
- `Critères d'acceptation` :
  - un revenu peut être créé avec ses relations optionnelles;
  - la liste reflète correctement les champs liés;
  - les cas sans client ni tag restent utilisables.
- `Zones de code visées` : `frontend/src/app/features/revenues/`, `frontend/src/app/services/revenue.service.ts`.
- `Testable à la fin` : CRUD manuel revenus avec et sans client/tag.

## US-011 — Construire l'écran Campagnes

- `Statut` : Prête
- `Phase` : 4
- `User story` : En tant qu'utilisateur authentifié, je veux gérer mes campagnes commerciales afin de suivre leur budget, leur période et leur statut opérationnel.
- `Périmètre` : liste, création, édition, suppression côté Angular pour `Campaign`.
- `Dépendances` : US-006, US-008.
- `Parallèle` : US-008, US-009, US-010, US-012.
- `Travaux attendus` :
  - créer le feature folder `campaigns/`;
  - proposer un formulaire incluant client, statut, budget et dates;
  - afficher les campagnes actives ou critiques de façon lisible;
  - gérer les états vides et les erreurs de validation.
- `Critères d'acceptation` :
  - une campagne ne peut être créée sans client valide;
  - le statut est éditable via la liste des valeurs métier attendues;
  - les dates et montants sont cohérents à l'affichage.
- `Zones de code visées` : `frontend/src/app/features/campaigns/`, `frontend/src/app/services/campaign.service.ts`.
- `Testable à la fin` : CRUD manuel campagnes, validation du client obligatoire, contrôle des statuts.

## US-012 — Créer le composant partagé d'autocomplétion de tags

- `Statut` : Prête
- `Phase` : 3-4
- `User story` : En tant qu'utilisateur authentifié, je veux sélectionner ou créer un tag directement dans les formulaires de dépenses et de revenus afin de catégoriser mes lignes sans quitter mon flux de saisie.
- `Périmètre` : composant partagé Angular, filtrage par catégorie, création inline.
- `Dépendances` : US-006, US-002.
- `Parallèle` : US-008, US-009, US-010, US-011.
- `Travaux attendus` :
  - créer un composant réutilisable dans `shared`;
  - charger les tags par catégorie `Expense` ou `Revenue`;
  - permettre la création inline d'un nouveau tag si non trouvé;
  - exposer une API simple pour les formulaires consommateurs.
- `Critères d'acceptation` :
  - le composant fonctionne pour dépenses et revenus;
  - la création inline rafraîchit immédiatement la liste disponible;
  - le composant ne mélange jamais les catégories de tags.
- `Zones de code visées` : `frontend/src/app/shared/`, `frontend/src/app/services/tag.service.ts`.
- `Testable à la fin` : sélection de tags existants, création de nouveaux tags depuis un formulaire métier.

## US-013 — Enrichir le dashboard frontend avec les indicateurs métier

- `Statut` : Prête
- `Phase` : 5
- `User story` : En tant qu'utilisateur authentifié, je veux un dashboard synthétique avec mes KPIs, mes tendances mensuelles et mes campagnes actives afin de piloter mon activité dès l'ouverture de l'application.
- `Périmètre` : composant dashboard Angular, consommation des endpoints métier, visualisation graphique.
- `Dépendances` : US-004, US-006. Dépend fortement de l'existence d'une donnée de démonstration ou de test.
- `Parallèle` : peut démarrer tardivement pendant la fin des US-008 à US-012 si les services sont prêts.
- `Travaux attendus` :
  - remplacer le dashboard placeholder existant par une vue métier;
  - afficher au minimum `Total Revenus`, `Total Dépenses`, `Bénéfice net`, `Nombre de clients`;
  - intégrer un graphique mensuel pour revenus et dépenses;
  - afficher les campagnes actives et les clients récents.
- `Critères d'acceptation` :
  - les données affichées correspondent aux agrégats backend;
  - l'écran reste exploitable en absence de données;
  - le chargement et les états vides sont lisibles;
  - le rendu est cohérent sur desktop et mobile.
- `Zones de code visées` : `frontend/src/app/features/dashboard/`, `frontend/src/app/services/dashboard.service.ts`, dépendances frontend éventuelles pour le graphique.
- `Testable à la fin` : vérification visuelle des KPIs, comparaison avec données backend, contrôle du graphique et des listes secondaires.

## US-014 — Stabilisation finale et recette transversale

- `Statut` : Prête
- `Phase` : 6
- `User story` : En tant que responsable livraison, je veux une passe finale de stabilisation et de recette afin de confirmer que les modules Prospect 2000 fonctionnent ensemble sans régression majeure.
- `Périmètre` : backend, frontend, tests, ergonomie et parcours transverse.
- `Dépendances` : US-005 à US-013.
- `Parallèle` : non, cette US clôture le lot.
- `Travaux attendus` :
  - exécuter les validations automatiques pertinentes backend et frontend;
  - faire un parcours manuel complet sur les modules clients, dépenses, revenus, campagnes et dashboard;
  - relever les écarts résiduels, corrections mineures et dettes bloquantes avant démonstration.
- `Critères d'acceptation` :
  - les builds backend et frontend passent;
  - les tests existants sont verts;
  - les parcours CRUD principaux fonctionnent bout en bout;
  - le dashboard reflète correctement les données créées dans les modules.
- `Zones de code visées` : transverses.
- `Testable à la fin` : recette globale projet, démonstration interne, qualification pour phase suivante.