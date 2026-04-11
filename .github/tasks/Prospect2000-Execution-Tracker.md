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

| US     | Domaine                 | Statut   | Dépend de              | Parallèle                      | Agent recommandé                                   | Testable maintenant                                                                                                                                                 |
| ------ | ----------------------- | -------- | ---------------------- | ------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-001 | Data model              | Terminé  | -                      | -                              | Backend CRUD Implementation Agent                  | Base de données stable et build backend                                                                                                                             |
| US-002 | API Clients/Tags        | Terminé  | US-001                 | US-003, US-004, US-005         | Backend CRUD Implementation Agent                  | CRUD clients/tags fiable + doublons et isolation par utilisateur validés                                                                                            |
| US-003 | API Dépenses/Revenus    | Terminé  | US-001                 | US-002, US-004, US-005         | Backend CRUD Implementation Agent                  | CRUD dépenses/revenus fiable + relations nullables sécurisées                                                                                                       |
| US-004 | API Campagnes/Dashboard | Terminé  | US-001                 | US-002, US-003, US-005         | Backend Dashboard Implementation Agent             | Campagnes validées par utilisateur + statuts/dates cohérents + dashboard summary/overview vide cohérent                                                             |
| US-005 | Tests backend           | Terminé  | US-002, US-003, US-004 | Peut démarrer en anticipation  | Backend Integration Test Agent                     | Couverture d'intégration renforcée sur tags, dépenses, revenus, campagnes et dashboard avec factory existante reproductible                                         |
| US-006 | Services Angular        | Terminé  | US-002, US-003, US-004 | US-007                         | Frontend Services Implementation Agent             | Services Angular typés pour clients, tags, dépenses, revenus, campagnes et dashboard                                                                                |
| US-007 | Navigation shell        | Terminé  | US-006                 | US-008, US-009, US-010, US-011 | Frontend CRUD UI Implementation Agent              | Navigation métier accessible avec shell protégé et routes lazy-loaded                                                                                               |
| US-008 | Ecran Clients           | Terminé  | US-006                 | US-009, US-010, US-011, US-012 | Frontend CRUD UI Implementation Agent              | CRUD clients en UI avec creation, edition, suppression, refresh immediat et erreurs lisibles                                                                        |
| US-009 | Ecran Dépenses          | Terminé  | US-006                 | US-008, US-010, US-011         | Frontend CRUD UI Implementation Agent              | CRUD depenses en UI avec tri par date, validation formulaire, tag facultatif et suppression                                                                         |
| US-010 | Ecran Revenus           | Terminé  | US-006                 | US-008, US-009, US-011         | Frontend CRUD UI Implementation Agent              | CRUD revenus en UI avec client/tag facultatifs, edition/suppression et affichage coherent des relations                                                             |
| US-011 | Ecran Campagnes         | Terminé  | US-006, US-008         | US-009, US-010, US-012         | Frontend CRUD UI Implementation Agent              | CRUD campagnes en UI avec client obligatoire, statut metier editable, budget/dates valides et etats vides lisibles                                                  |
| US-012 | Tag autocomplete        | Terminé  | US-002, US-006         | US-008, US-009, US-010, US-011 | Frontend CRUD UI Implementation Agent              | Composant shared de selection/autocomplete de tags avec creation inline, rafraichissement immediat et isolation stricte Expense/Revenue                             |
| US-013 | Dashboard frontend      | Terminé  | US-004, US-006         | Fin de vague UI                | Frontend Dashboard Implementation Agent            | Dashboard métier exploitable avec KPIs financiers, tendance mensuelle, campagnes actives, clients récents et états vides responsives                                |
| US-014 | Stabilisation finale    | Terminé  | US-005 à US-013        | -                              | Project Tracker Steward + QA Readiness Story Agent | Recette transverse relancee et validee le 2026-04-12 ; lot Prospect 2000 ferme au perimetre livre                                                                    |
| US-015 | Auth backend            | À faire  | US-014                 | US-016, US-017, US-019, US-020 | Backend CRUD Implementation Agent                  | Hardening de l'identite JWT, `auth/me`, policies et erreurs 401/403/429 pret a demarrer                                                                               |
| US-016 | Session frontend        | À faire  | US-015                 | US-017, US-019, US-020         | Frontend Services Implementation Agent             | Strategie de session UI, redirect safe, guards et gestion centralisee des 401 pret a demarrer                                                                          |
| US-017 | Tokens et secrets       | À faire  | US-014                 | US-015, US-019                 | Backend CRUD Implementation Agent                  | Rotation/revocation des tokens, reset password hash, hygiene secrets et config critique pret a demarrer                                                                |
| US-018 | Isolation et API        | À faire  | US-015                 | US-019, US-020                 | Backend CRUD Implementation Agent                  | Audit isolation `UserId`, validations DTO et robustesse API pret a demarrer                                                                                            |
| US-019 | Infra et CI/CD          | À faire  | US-014                 | US-015, US-017, US-018, US-020 | Explore                                             | Hardening Docker, configuration production et pipeline securite pret a demarrer                                                                                        |
| US-020 | Robustesse frontend     | À faire  | US-016                 | US-018, US-019                 | Frontend CRUD UI Implementation Agent              | Confirmations UX sensibles, memory leaks, pagination et resilience UI pret a demarrer                                                                                  |
| US-021 | Tests et readiness      | À faire  | US-015 à US-020        | -                              | Backend Integration Test Agent + QA Readiness Story Agent | Matrice QA post-audit, tests auth/RBAC/multi-tenant et verdict readiness pret a demarrer                                                                       |

---

## Vagues d'exécution parallèles

### Vague A — Stabilisation backend

| Lane | US     | Objectif                                       |
| ---- | ------ | ---------------------------------------------- |
| A1   | US-002 | Clients et Tags                                |
| A2   | US-003 | Dépenses et Revenus                            |
| A3   | US-004 | Campagnes et Dashboard                         |
| A4   | US-005 | Renforcement de la couverture de tests backend |

Sortie attendue : backend CRUD et dashboard suffisamment stables pour servir de contrat au frontend.

### Vague B — Fondation frontend

| Lane | US     | Objectif                    |
| ---- | ------ | --------------------------- |
| B1   | US-006 | Services Angular métier     |
| B2   | US-007 | Routes et navigation métier |

Sortie attendue : application Angular prête à recevoir plusieurs écrans en parallèle.

### Vague C — Ecrans CRUD

| Lane | US     | Objectif               |
| ---- | ------ | ---------------------- |
| C1   | US-008 | Module Clients         |
| C2   | US-009 | Module Dépenses        |
| C3   | US-010 | Module Revenus         |
| C4   | US-011 | Module Campagnes       |
| C5   | US-012 | Composant partagé Tags |

Sortie attendue : modules métier exploitables indépendamment, puis intégration homogène.

### Vague D — Dashboard métier

| Lane | US     | Objectif          |
| ---- | ------ | ----------------- |
| D1   | US-013 | Dashboard enrichi |

Sortie attendue : vue synthétique basée sur les données réelles des modules CRUD.

### Vague E — Recette finale

| Lane | US     | Objectif                            |
| ---- | ------ | ----------------------------------- |
| E1   | US-014 | Stabilisation et recette transverse |

### Vague F — Hardening securite et session

| Lane | US     | Objectif                                      |
| ---- | ------ | --------------------------------------------- |
| F1   | US-015 | Durcir auth backend et controles d'acces      |
| F2   | US-016 | Securiser session frontend et redirects       |
| F3   | US-017 | Securiser tokens, secrets et reset password   |
| F4   | US-018 | Garantir isolation des donnees et robustesse  |

Sortie attendue : base auth/session/coherence multi-tenant suffisamment durcie pour ouvrir la phase d'industrialisation.

### Vague G — Industrialisation et readiness

| Lane | US     | Objectif                                      |
| ---- | ------ | --------------------------------------------- |
| G1   | US-019 | Durcir Docker, configuration et pipeline CI   |
| G2   | US-020 | Renforcer robustesse et maintenabilite UI     |
| G3   | US-021 | Completer les tests et la readiness finale    |

Sortie attendue : depot plus sur, mieux teste et documente avec verdict explicite de readiness production.

---

## Jalons de test

| Jalon | Déclencheur                               | Commandes / scénarios                                                                                                                                                                                                                                                                               | Résultat attendu                                                                                                            | Statut                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1    | US-002 terminée                           | `dotnet test api/Api.Tests/Api.Tests.csproj` + tests manuels clients/tags                                                                                                                                                                                                                           | CRUD Clients/Tags fiable                                                                                                    | Validé                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| T2    | US-003 terminée                           | `dotnet test api/Api.Tests/Api.Tests.csproj` + tests manuels dépenses/revenus                                                                                                                                                                                                                       | CRUD financier fiable                                                                                                       | Automatisé OK, tests manuels restants                                                                                                                                                                                                                                                                                                                                                                                                          |
| T3    | US-004 terminée                           | `dotnet test api/Api.Tests/Api.Tests.csproj` + appel `dashboard/summary` et `dashboard/overview`                                                                                                                                                                                                    | Agrégats dashboard cohérents                                                                                                | Validé                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| T4    | US-005 terminée                           | `dotnet test api/Api.Tests/Api.Tests.csproj`                                                                                                                                                                                                                                                        | Suite backend renforcée verte                                                                                               | Terminé le 2026-04-11                                                                                                                                                                                                                                                                                                                                                                                                                          |
| T5    | US-006 terminée                           | `cd frontend && npm run build`                                                                                                                                                                                                                                                                      | Services Angular compilent sans erreur                                                                                      | Terminé le 2026-04-11                                                                                                                                                                                                                                                                                                                                                                                                                          |
| T6    | US-007 terminée                           | navigation manuelle après login                                                                                                                                                                                                                                                                     | accès aux modules sans URL manuelle                                                                                         | Terminé le 2026-04-11                                                                                                                                                                                                                                                                                                                                                                                                                          |
| T7    | US-008 à US-012 terminées progressivement | test manuel CRUD de chaque module                                                                                                                                                                                                                                                                   | écrans métier exploitables                                                                                                  | US-008, US-009, US-010, US-011 et US-012 livres le 2026-04-11, recette manuelle clients/depenses/revenus/campagnes + tag autocomplete shared faisable                                                                                                                                                                                                                                                                                          |
| T8    | US-013 terminée                           | `cd frontend && npm run build` + validation visuelle dashboard                                                                                                                                                                                                                                      | dashboard métier lisible et cohérent                                                                                        | Terminé le 2026-04-11                                                                                                                                                                                                                                                                                                                                                                                                                          |
| T9    | US-014 terminee                          | `cd api/Api && dotnet build`; `cd api/Api.Tests && dotnet test`; `cd frontend && npm run lint`; `cd frontend && npm run build`; recette manuelle transverse clients -> depenses -> revenus -> campagnes -> dashboard avec verification des creations, editions, suppressions, relations et agregats | lot Prospect 2000 qualifie au perimetre prevu et cloture au titre de la vague initiale                                   | Backend valide le 2026-04-11 (`dotnet build` OK, `dotnet test` OK 25/25) ; frontend valide le 2026-04-11 (`npm run lint` OK, `npm run build` OK avec warnings budgets CSS non bloquants) ; recette transverse rerelancee et confirmee OK le 2026-04-12 apres correctifs UI |
| T10   | US-015 a US-017                          | `cd api/Api && dotnet build`; `cd api/Api.Tests && dotnet test`; verifications manuelles login -> auth/me -> refresh -> logout -> reset password ; verification des 401/403/429 ; controle des redirections login et deep links proteges | socle auth/session securise et coherent cote backend + frontend                                                           | A faire |
| T11   | US-018 terminee                          | `cd api/Api.Tests && dotnet test` + matrice multi-utilisateur sur clients/tags/depenses/revenus/campagnes/dashboard                                                                                                                                | isolation stricte par utilisateur et erreurs 400/404 controlees                                                          | A faire |
| T12   | US-019 terminee                          | build Docker ; verification compose locale ; pipeline CI avec scans securite, secrets detection, audit packages et fail-gates                                                                                                                        | surface infra/CI durcie et configuration production mieux cadree                                                         | A faire |
| T13   | US-020 terminee                          | `cd frontend && npm run lint`; `cd frontend && npm run build`; validations manuelles sur confirmations sensibles, relance apres erreur, navigation repetee et listes lourdes                                                                        | UX plus robuste, sans fuites memoire visibles ni actions sensibles accidentelles                                         | A faire |
| T14   | US-021 terminee                          | `cd api/Api.Tests && dotnet test`; validations frontend cibles ; revue du tracker, risques residuels et checklist readiness                                                                                                                          | verdict explicite de readiness post-audit avec preuves minimales documentees                                             | A faire |

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
- US-014 terminee : le lot Prospect 2000 initial est desormais qualifie et ferme ; la recette transverse relancee le 2026-04-12 confirme que clients, depenses, revenus, campagnes et dashboard fonctionnent ensemble au perimetre livre.
- US-014 vigilance conservee : le build frontend passe toujours avec warnings de budgets CSS sur plusieurs modules ; ces warnings ne bloquent pas la cloture fonctionnelle mais restent une dette de durcissement.
- Vague post-audit ouverte : les nouvelles stories US-015 a US-021 sont pretes pour traiter les points critiques du rapport d'audit sur auth, tokens, isolation, infrastructure, CI/CD, robustesse frontend et readiness.
- Prêt maintenant cote backend : US-015, US-017 et US-019 peuvent etre lances sans attendre la suite de la vague.
- Prêt maintenant cote frontend : le cadrage de US-016 et US-020 peut commencer tout de suite, avec validation finale liee au contrat backend de session.
- Prêt maintenant cote QA : la matrice de done criteria post-audit est connue ; US-021 peut preparer les scenarios et fermera la vague en dernier.

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
- 2026-04-11 - Vague E ouverte - testable maintenant : US-014 devient la seule story ouverte/prete a execution pour la stabilisation finale, la recette transverse et la verification des commandes de cloture T9.
- 2026-04-11 - US-014 cadrage QA - testable maintenant : matrice de validation finalisee pour T9 avec checks automatiques backend/frontend et scenario manuel cible clients, depenses, revenus, campagnes, dashboard; reste a executer sans rouvrir US-002 a US-013 hors anomalie demontree.
- 2026-04-11 - US-014 execution partielle - testable maintenant : backend T9 valide (`dotnet build` OK, `dotnet test` OK 25/25) sans correctif code; restent a confirmer le lint/build frontend et la recette transverse clients, depenses, revenus, campagnes et dashboard avant cloture.
- 2026-04-11 - US-014 reliquat QA clarifie - testable maintenant : backend deja valide pour T9 dans cette session ; restent uniquement `cd frontend && npm run lint`, `cd frontend && npm run build` et la recette manuelle transverse avant fermeture.
- 2026-04-11 - US-014 frontend automatise valide - testable maintenant : `cd frontend && npm run lint` OK et `cd frontend && npm run build` OK dans le repo Prospect2000 Dashboard ; warnings budgets CSS constates au build sans echec, recette transverse encore requise avant cloture.
- 2026-04-11 - US-014 recette manuelle sequencee - testable maintenant : T9 ne depend plus que d'une recette utilisateur executee dans l'ordre et documentee avec observations visibles sur etats vides, navigation, creation/edition client, depense, revenu, campagne, dashboard puis suppressions non bloquantes.
- 2026-04-11 - US-014 correctifs frontend de recette livres - testable maintenant : la regression montant revenus est absorbee cote formulaire, le shell ne bloque plus la saisie d'espaces dans Campagnes, et le tag autocomplete shared cree puis selectionne immediatement les nouveaux tags en Depenses/Revenus ; rerun manuel cible a effectuer avant cloture.
- 2026-04-12 - US-014 terminee - testable maintenant : recette transverse rerelancee et confirmee OK par validation utilisateur ; la vague initiale Prospect 2000 est fermee au perimetre livre.
- 2026-04-12 - Vague post-audit ouverte - testable maintenant : backlog et tracker etendus avec US-015 a US-021 pour securite, session, isolation, infrastructure, CI/CD, robustesse frontend et readiness de production.
