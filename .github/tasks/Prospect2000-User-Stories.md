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

- `Statut` : Terminé
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

- `Statut` : Terminé
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

- `Statut` : Terminé
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

- `Statut` : Terminé
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

- `Statut` : Terminé
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

- `Statut` : Terminé
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

- `Statut` : Terminé
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

- `Statut` : Terminé
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

- `Statut` : Terminé
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

- `Statut` : Terminé
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

- `Statut` : Terminé
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

- `Statut` : Terminé
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

- `Statut` : Terminé
- `Phase` : 6
- `User story` : En tant que responsable livraison, je veux une passe finale de stabilisation et de recette afin de confirmer que les modules Prospect 2000 fonctionnent ensemble sans régression majeure.
- `Périmètre` : backend, frontend, tests, ergonomie et parcours transverse.
- `Dépendances` : US-005 à US-013.
- `Parallèle` : non, cette US clôture le lot.
- `Travaux attendus` :
  - exécuter les validations automatiques minimales du lot : `cd api/Api && dotnet build`, `cd api/Api.Tests && dotnet test`, `cd frontend && npm run lint`, `cd frontend && npm run build`;
  - faire une recette manuelle transverse limitée au périmètre livré : créer puis modifier un client, rattacher ce client à au moins un revenu et une campagne, créer au moins une dépense avec ou sans tag, puis vérifier la prise en compte dans le dashboard;
  - vérifier les suppressions non bloquantes, les états vides et la navigation sans rouvrir les US-002 à US-013 hors anomalie démontrée;
  - relever les écarts résiduels, corrections mineures et dettes bloquantes avant démonstration.
- `Critères d'acceptation` :
  - `cd api/Api && dotnet build` et `cd api/Api.Tests && dotnet test` sont verts sans adaptation de la factory de tests;
  - `cd frontend && npm run lint` et `cd frontend && npm run build` sont verts sur le périmètre livré jusqu'au dashboard;
  - les parcours CRUD principaux clients, dépenses, revenus et campagnes fonctionnent bout en bout dans l'UI avec navigation stable;
  - le dashboard reflète correctement les données créées ou modifiées pendant la recette transverse;
  - toute anomalie relevée pendant US-014 est qualifiée comme régression démontrée ou hors périmètre de clôture.
- `Zones de code visées` : transverses.
- `Testable à la fin` : qualification transverse du lot Prospect 2000 avec preuve d'exécution des checks automatiques backend/frontend, scénario manuel couvrant clients, dépenses, revenus, campagnes et dashboard, et liste explicite des risques résiduels éventuels.

## US-015 — Durcir l'auth backend et les contrôles d'accès

- `Statut` : Prête
- `Phase` : 7
- `User story` : En tant que mainteneur backend, je veux une identité JWT lue de manière uniforme et des contrôles d'accès cohérents afin que les endpoints auth, métier et admin répondent de façon sûre et prévisible.
- `Périmètre` : claims JWT, endpoint `auth/me`, policies Admin/Owner, extraction du contexte utilisateur, erreurs 401/403/429.
- `Dépendances` : US-014.
- `Parallèle` : US-016, US-017, US-019, US-020.
- `Travaux attendus` :
  - normaliser le contrat d'identité JWT utilisé par l'API pour `UserId`, `Email` et `Role`;
  - centraliser la récupération de l'utilisateur courant au lieu de dupliquer du parsing de claims dans les contrôleurs;
  - supprimer les erreurs 500 induites par des claims absents ou mal formés et remplacer les `Guid.Parse()` sensibles par des chemins contrôlés;
  - revoir `GET /api/v1/auth/me`, les policies d'autorisation et les réponses `ProblemDetails` associées;
  - vérifier l'application cohérente du rate limiting sur les endpoints auth sensibles.
- `Critères d'acceptation` :
  - tous les endpoints protégés utilisent le même mécanisme backend pour résoudre l'identité courante;
  - `GET /api/v1/auth/me` retourne des données cohérentes avec un token valide et une réponse contrôlée avec un token invalide;
  - un claim manquant ou mal formé n'entraîne jamais d'exception non gérée;
  - les accès non autorisés renvoient des 401/403 cohérents et les seuils de rate limiting renvoient 429 de façon prévisible.
- `Zones de code visées` : `api/Api/Controllers/`, `api/Api/Services/AuthService.cs`, `api/Api/Extensions/ServiceCollectionExtensions.cs`, middleware/policies auth.
- `Testable à la fin` : login, `auth/me`, accès admin autorisé/refusé, dépassement de limite sur login/refresh/forgot/reset.

## US-016 — Sécuriser la session frontend, les redirections et l'expiration de session

- `Statut` : Prête
- `Phase` : 7
- `User story` : En tant qu'utilisateur authentifié, je veux que ma session soit restaurée proprement sans exposer mes jetons dans le navigateur et sans redirection dangereuse afin de limiter les risques de vol de session et de navigation incohérente.
- `Périmètre` : login, logout, bootstrap de session, `returnUrl`, guards, interceptors 401/refresh, navigation post-auth.
- `Dépendances` : US-015 pour le contrat backend stabilisé de session.
- `Parallèle` : peut cadrer en parallèle de US-017, US-019 et US-020, mais dépend des décisions backend pour la validation finale.
- `Travaux attendus` :
  - supprimer la persistance incohérente des jetons en `sessionStorage`/`localStorage` au profit d'une stratégie unifiée et minimale;
  - filtrer les `returnUrl` pour n'autoriser que des routes internes sûres;
  - unifier la gestion des 401 et du refresh pour éviter doublons, boucles et sessions fantômes;
  - clarifier les guards pour distinguer non authentifié, non autorisé et accès bloqué par abonnement;
  - garantir un nettoyage complet de l'état UI au logout et après expiration définitive.
- `Critères d'acceptation` :
  - aucun jeton sensible n'est stocké de manière incohérente dans le navigateur après authentification;
  - un `returnUrl` externe ou invalide est ignoré au profit d'une route interne sûre;
  - plusieurs 401 simultanés ne déclenchent qu'une seule tentative de refresh;
  - un échec de refresh renvoie proprement vers la connexion sans boucle ni état auth résiduel.
- `Zones de code visées` : `frontend/src/app/core/services/auth.service.ts`, `frontend/src/app/core/interceptors/`, `frontend/src/app/core/guards/`, `frontend/src/app/features/auth/`, `frontend/src/app/app.routes.ts`.
- `Testable à la fin` : connexion, rechargement, deep link protégé, open redirect refusé, expiration de session, logout et retour arrière navigateur.

## US-017 — Sécuriser les tokens, les secrets et le reset password

- `Statut` : Prête
- `Phase` : 7
- `User story` : En tant que mainteneur sécurité, je veux que les tokens et secrets critiques soient gérés sans stockage sensible en clair et avec des cycles de vie explicites afin de réduire le risque de compromission et de réutilisation abusive.
- `Périmètre` : refresh tokens, reset password, révocation de session, validation startup des secrets et durées critiques, hygiène de configuration locale.
- `Dépendances` : US-014.
- `Parallèle` : US-015, US-019 et cadrage US-016.
- `Travaux attendus` :
  - hacher aussi les tokens de reset password et comparer côté service sans stockage en clair;
  - mettre en place une vraie révocation/rotation des sessions côté refresh et logout;
  - invalider les sessions actives après reset password ou changement critique de sécurité;
  - valider au démarrage les secrets JWT et options temporelles critiques;
  - sortir progressivement les secrets et credentials de développement des fichiers suivis et documenter l'usage de `user-secrets`/variables d'environnement.
- `Critères d'acceptation` :
  - aucun token de reset n'est stocké en clair en base;
  - un refresh token ne peut pas être réutilisé après rotation ou révocation;
  - un reset password invalide les sessions antérieures de l'utilisateur;
  - l'application échoue au démarrage si la configuration JWT critique est absente ou invalide;
  - le flux local de développement reste documenté sans propager des secrets réels dans la documentation produit.
- `Zones de code visées` : `api/Api/Services/AuthService.cs`, `api/Api/Controllers/AuthController.cs`, `api/Api/Models/Entities/`, `api/Api/Data/AppDbContext.cs`, `api/Api/appsettings*.json`, scripts/configuration locale.
- `Testable à la fin` : login -> refresh -> rejeu refusé, forgot/reset password, logout invalide la session, validation startup des secrets.

## US-018 — Garantir l'isolation des données et la robustesse API

- `Statut` : Prête
- `Phase` : 7
- `User story` : En tant que responsable sécurité backend, je veux que chaque ressource Prospect 2000 soit strictement isolée par utilisateur avec des validations d'entrée robustes afin qu'aucun accès cross-tenant ni crash évitable ne soit possible.
- `Périmètre` : services CRUD, agrégats dashboard, rattachements Client/Tag/Expense/Revenue/Campaign, DTOs et validations, réponses 400/404/409.
- `Dépendances` : US-015.
- `Parallèle` : US-019, US-020, cadrage US-021.
- `Travaux attendus` :
  - auditer systématiquement les requêtes EF Core pour garantir le filtrage par `UserId` sur lecture, modification, suppression et agrégats;
  - sécuriser les rattachements cross-tenant par identifiants fournis par le client;
  - remplacer les chemins d'erreur techniques par des réponses métier contrôlées;
  - renforcer les DTOs avec validations de longueur, format et cohérence minimales;
  - préparer le terrain pour la pagination sur les endpoints de liste les plus volumineux.
- `Critères d'acceptation` :
  - il est impossible de lire, modifier, supprimer ou rattacher une ressource d'un autre utilisateur;
  - les agrégats dashboard restent strictement isolés par propriétaire;
  - les payloads invalides retournent des erreurs 400 explicites au lieu d'exceptions;
  - les endpoints de liste critiques peuvent ensuite accueillir une pagination sans refonte des contrats principaux.
- `Zones de code visées` : `api/Api/Services/ClientService.cs`, `api/Api/Services/TagService.cs`, `api/Api/Services/ExpenseService.cs`, `api/Api/Services/RevenueService.cs`, `api/Api/Services/CampaignService.cs`, `api/Api/Services/DashboardService.cs`, `api/Api/Models/DTOs/`, contrôleurs Prospect.
- `Testable à la fin` : matrice multi-utilisateur sur clients, tags, dépenses, revenus, campagnes, dashboard, erreurs payload invalides.

## US-019 — Durcir l'infrastructure, Docker, la configuration et le pipeline CI/CD

- `Statut` : Prête
- `Phase` : 7
- `User story` : En tant que responsable plateforme, je veux une chaîne d'exécution locale et CI plus sûre afin de réduire l'exposition réseau, les dérives de configuration et les angles morts de sécurité avant production.
- `Périmètre` : `docker-compose.yml`, `Dockerfile`, configurations d'environnement, workflow GitHub Actions, scans et exemples de variables de production.
- `Dépendances` : US-014.
- `Parallèle` : US-015, US-017, US-020.
- `Travaux attendus` :
  - supprimer l'exposition inutile de PostgreSQL ou la limiter explicitement à `127.0.0.1` selon le besoin local;
  - durcir l'image Docker finale avec utilisateur non-root et versions/pinnings explicités quand pertinent;
  - verrouiller `AllowedHosts`, la configuration hors développement et les exemples `.env`/`.env.prod.example`;
  - ajouter des contrôles CI sur vulnérabilités packages, SAST, secrets detection et fail-gates de scan;
  - clarifier dans la documentation ce qui est local-only versus prêt à déployer.
- `Critères d'acceptation` :
  - la base n'est plus exposée publiquement par défaut depuis `docker-compose.yml`;
  - le conteneur applicatif final n'exécute pas le runtime avec les privilèges root;
  - la CI exécute au moins build/tests existants plus scans de sécurité et détection de secrets avec échec possible du pipeline;
  - la documentation de configuration distingue clairement développement local et production.
- `Zones de code visées` : `docker-compose.yml`, `Dockerfile`, `.github/workflows/ci.yml`, `.env.example`, fichiers de config racine et docs d'exploitation.
- `Testable à la fin` : stack locale isolée, pipeline sécurité exécutée, build Docker, exemples de config production exploitables.

## US-020 — Renforcer la robustesse et la maintenabilité frontend

- `Statut` : Prête
- `Phase` : 8
- `User story` : En tant qu'utilisateur et équipe frontend, nous voulons des écrans plus résilients et plus maintenables afin d'éviter les fuites mémoire, les actions sensibles accidentelles et la dégradation UX sous charge ou erreur réseau.
- `Périmètre` : confirmations UX sensibles, memory leaks, gros composants, timeouts/retry GET, pagination ou découpage de listes, états loading/error/empty.
- `Dépendances` : US-016 pour la base de session sécurisée ; sinon autonome sur la structure UI.
- `Parallèle` : US-018, US-019, préparation US-021.
- `Travaux attendus` :
  - remplacer les confirmations sensibles natives par un composant partagé cohérent, en priorité sur l'admin et les suppressions métier;
  - auditer les souscriptions et timers pour introduire des patterns d'auto-nettoyage Angular;
  - découper les composants trop volumineux en sous-composants plus lisibles et testables;
  - standardiser timeout/retry sur les GET et les états UI de chargement, vide, erreur et relance;
  - préparer ou intégrer la pagination des listes les plus lourdes.
- `Critères d'acceptation` :
  - les changements de rôle admin et suppressions sensibles demandent une confirmation explicite non native;
  - les navigations répétées n'empilent pas des souscriptions ou requêtes résiduelles visibles;
  - les gros écrans sont découpés sans régression fonctionnelle;
  - les listes et écrans principaux restent utilisables lors d'erreurs réseau, lenteurs ou jeux de données plus volumineux.
- `Zones de code visées` : `frontend/src/app/features/admin/`, `frontend/src/app/features/clients/`, `frontend/src/app/features/expenses/`, `frontend/src/app/features/revenues/`, `frontend/src/app/features/campaigns/`, `frontend/src/app/features/dashboard/`, `frontend/src/app/shared/`.
- `Testable à la fin` : confirmations admin/suppressions, navigation répétée entre modules, relance après erreur, listes paginées ou découpées, absence de comportements résiduels.

## US-021 — Étendre la couverture de tests, QA et readiness de production

- `Statut` : Prête
- `Phase` : 8
- `User story` : En tant que responsable qualité, je veux une matrice de validation couvrant auth, RBAC, isolation de données, sécurité HTTP, frontend auth UX et pipeline afin que les remédiations post-audit soient démontrables avant toute exposition utilisateur.
- `Périmètre` : tests d'intégration backend auth/RBAC, validations frontend ciblées, critères de done transverses, tracker QA et recette de production-readiness.
- `Dépendances` : US-015 à US-020.
- `Parallèle` : peut démarrer en anticipation, mais se clôture en dernier.
- `Travaux attendus` :
  - compléter la suite backend sur login, refresh, logout, reset password, RBAC, isolation multi-tenant et garde-fous critiques;
  - définir les validations minimales frontend sur login/logout/expiration, guards, redirects et actions sensibles;
  - consigner dans le tracker les preuves minimales attendues : commandes exécutées, scénario manuel, risque résiduel;
  - ajouter une passe explicite de readiness production après remédiation des points P0/P1;
  - transformer le rapport d'audit en matrice de non-régression exploitable pour les prochains lots.
- `Critères d'acceptation` :
  - chaque lot post-audit possède au moins un contrôle automatisé et un scénario manuel rejoué;
  - les régressions auth, sécurité et multi-tenant deviennent détectables automatiquement;
  - le tracker décrit clairement ce qui est testable, ce qui reste bloquant et le risque résiduel;
  - une passe finale de readiness peut conclure explicitement si le dépôt est ou non prêt pour production.
- `Zones de code visées` : `api/Api.Tests/Integration/`, `frontend/` pour validations ciblées si des tests existent, `.github/tasks/Prospect2000-Execution-Tracker.md`, docs QA associées.
- `Testable à la fin` : suite backend audit verte, validations frontend ciblées documentées, matrice QA à jour, verdict de readiness explicite.