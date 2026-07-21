# JAMBO — Cahier des charges projet (PWA)

> Ce document est destiné à un agent IA de développement (type Antigravity, OpenCode, Claude Code, etc.) pour construire l'application de bout en bout. Il contient le contexte, les règles métier, l'architecture technique attendue, les modèles de données et le plan de développement.

---

## 1. Contexte du projet

**Jambo** est un jeu de dés traditionnel camerounais joué en argent (ou mise) entre plusieurs joueurs. Ce projet consiste à le transformer en **PWA (Progressive Web App)** multijoueur en temps réel, jouable à distance, avec :

- Des **jetons virtuels** dans un premier temps (MVP) — pas d'argent réel branché pour l'instant. L'intégration Mobile Money (Orange Money / MTN MoMo) est prévue en **phase 2**, une fois le cadre légal clarifié (déclaration/autorisation auprès du Ministère en charge des jeux au Cameroun, loi n°2015/012 et décret n°2019/2300/PM).
- Un système de **commission (rake) de 10 %** prélevé par la plateforme sur le pot total de chaque partie gagnée.
- Une **animation réaliste des dés** (rotation 3D ou sprite animée) visible en temps réel par tous les joueurs présents dans la partie.
- Une expérience "on reste chez soi" : chacun joue depuis son téléphone/PC, dans une room partagée.

**Objectif du MVP** : valider entièrement la logique de jeu, la synchronisation temps réel, l'UX des dés, et le modèle de commission — avec des jetons virtuels uniquement.

---

## 2. Règles du jeu (logique métier — à respecter strictement)

### 2.1 Déroulement d'une partie

1. Un joueur crée une **room** et fixe la mise (en jetons).
2. Les autres joueurs rejoignent via un code de room.
3. Chaque joueur doit **confirmer sa mise** (débit de jetons virtuels) avant que la partie ne démarre. La partie ne commence que lorsque tous les participants ont mis.
4. Le pot total = somme des mises de tous les joueurs.
5. Les joueurs lancent **à tour de rôle** (ordre défini à l'entrée dans la room, ou aléatoire au démarrage — à trancher, voir §2.4). Chaque joueur lance **deux dés**.
6. **Règle "Million"** : si un joueur obtient **1 et 1** (les deux dés font 1 chacun), il **gagne instantanément** toute la partie. Le tour s'arrête immédiatement, même si tout le monde n'a pas encore joué.
7. Si personne ne fait "Million", une fois que **tous les joueurs ont lancé**, on compare la somme des deux dés de chacun. Le joueur avec la **somme la plus haute** remporte le pot.
8. **Cas d'égalité** : si deux joueurs (ou plus) ont la même somme maximale, la partie est **annulée et rejouée immédiatement avec le même pot**, sans que personne n'ait à remettre de mise. Seuls les joueurs de la partie annulée relancent (nouveau tour complet).
9. Une fois un gagnant déterminé (hors égalité) : le pot est crédité au gagnant, **moins 10 % de commission plateforme**, et la partie se termine (statut `FINISHED`).

### 2.2 Calcul de la commission

```
commission = pot_total * 0.10
gain_net_gagnant = pot_total - commission
```

Exemple : 4 joueurs misent 500 jetons chacun → pot = 2000 → commission = 200 → le gagnant reçoit 1800.

La commission doit être **enregistrée en base** (table `transactions` ou `platform_revenue`) à chaque partie terminée, pour permettre un reporting/dashboard admin plus tard.

### 2.3 Règle "Million" — précision importante

- "Million" = dé1 == 1 ET dé2 == 1 sur le **même lancer** d'un même joueur.
- Cette règle prime sur tout : même si un autre joueur a déjà un score élevé, si un joueur fait Million, il gagne immédiatement, peu importe l'ordre.
- Il ne peut y avoir qu'un joueur qui teste le Million par tour (le premier qui le sort déclenche la fin immédiate).

### 2.4 Points à trancher avec le porteur de projet (à poser à l'utilisateur, ne pas décider seul dans le code sans les rendre configurables)

- Ordre des joueurs : fixe selon l'ordre d'arrivée dans la room, ou tirage aléatoire à chaque partie ?
- Nombre min/max de joueurs par room (proposition : 2 à 8).
- Délai maximum pour qu'un joueur lance son tour (timeout → forfait automatique ?).
- Que se passe-t-il si un joueur quitte/se déconnecte en pleine partie après avoir mis sa mise ? (proposition : la mise reste engagée, le joueur a X secondes pour revenir, sinon un lancer automatique est fait pour lui ou il est déclaré perdant).

---

## 3. Architecture technique

### 3.1 Stack recommandée

| Couche | Techno | Raison |
|---|---|---|
| Frontend | React + Vite, PWA (manifest.json + service worker via `vite-plugin-pwa`) | Installable sur mobile, offline-capable pour les écrans statiques |
| Communication temps réel | Socket.io (WebSockets) | Nécessaire pour tour par tour synchronisé + animation dés visible par tous |
| Backend | Node.js + Express (ou Fastify) | Gère l'API REST (auth, comptes, historique) + serveur Socket.io |
| Base de données persistante | PostgreSQL | Comptes, historique des parties, transactions, soldes de jetons |
| Cache / état des parties en cours | Redis | État éphémère des rooms actives (rapide, TTL, pub/sub pour scaling multi-instance) |
| Animation des dés | Three.js (dés 3D physiques) **ou** Lottie/CSS sprite animation (plus simple/léger) | Voir §4 |
| Auth | JWT + numéro de téléphone (OTP SMS) — cohérent avec l'usage Mobile Money futur | Les utilisateurs camerounais s'identifient naturellement par numéro |

### 3.2 Pourquoi le RNG (tirage des dés) doit être 100 % côté serveur

**Règle non négociable** : le résultat des dés est généré par le **serveur**, jamais par le client. Le client ne fait que déclencher la demande de lancer et **recevoir** le résultat, puis joue l'animation correspondante. Sinon un joueur peut trafiquer son propre résultat.

```js
// Backend uniquement — jamais dans le code frontend
const crypto = require('crypto');
function lancerDe() {
  return crypto.randomInt(1, 7); // 1 à 6 inclus, cryptographiquement sûr
}
```

Le frontend reçoit `{ dé1: X, dé2: Y }` via WebSocket et **anime** l'affichage pour aboutir visuellement sur ce résultat (voir §4).

---

## 4. Animation des dés (exigence UX forte)

L'utilisateur veut que ça ressemble à un **vrai lancer de dés** : rotation/rebond, visible en temps réel par **tous les participants de la room**, pas seulement celui qui joue.

### Approche recommandée (simple et fiable, MVP) :
- Sprite-sheet ou séquence d'images des 6 faces d'un dé, animée en CSS (rotation rapide aléatoire pendant ~1.5 à 2 secondes), qui **converge** visuellement vers la face reçue du serveur.
- Librairie utilisable : `@3d-dice/dice-box` (dés 3D avec moteur physique, prêt à l'emploi, basé sur Three.js/Cannon.js) — rendu très réaliste, rebonds physiques.

### Synchronisation multi-joueurs
- Quand le joueur A clique sur "Lancer", le serveur :
  1. Calcule immédiatement le résultat (RNG serveur).
  2. Diffuse un événement `dice:rolling` à **toute la room** (tout le monde voit l'animation démarrer en même temps).
  3. Après le délai d'animation (ex. 2s), diffuse `dice:result` avec le résultat final à toute la room.
- Ainsi, tous les joueurs voient la même animation, au même moment, aboutissant au même résultat — cohérence garantie car c'est le serveur qui orchestre le timing, pas chaque client indépendamment.

---

## 5. Modèle de données (PostgreSQL)

```sql
-- Comptes utilisateurs
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  pseudo VARCHAR(50),
  token_balance BIGINT NOT NULL DEFAULT 0, -- jetons virtuels
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rooms / parties
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(10) UNIQUE NOT NULL,
  stake_amount BIGINT NOT NULL, -- mise par joueur
  status VARCHAR(20) NOT NULL DEFAULT 'LOBBY',
  -- LOBBY | COLLECTING_STAKES | IN_PROGRESS | CANCELLED_TIE | FINISHED
  pot_total BIGINT DEFAULT 0,
  commission_amount BIGINT DEFAULT 0,
  winner_id UUID REFERENCES users(id),
  round_number INT DEFAULT 1, -- incrémenté à chaque égalité/rejoue
  created_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ
);

-- Participants d'une partie
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  user_id UUID REFERENCES users(id),
  turn_order INT,
  has_paid_stake BOOLEAN DEFAULT false,
  dice1 INT,
  dice2 INT,
  score INT, -- dice1+dice2, recalculé à chaque round
  is_million BOOLEAN DEFAULT false,
  has_rolled BOOLEAN DEFAULT false,
  UNIQUE(game_id, user_id)
);

-- Historique des transactions (jetons)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  game_id UUID REFERENCES games(id),
  type VARCHAR(20) NOT NULL, -- STAKE | PAYOUT | COMMISSION | TOPUP (phase 2)
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Revenu plateforme (pour dashboard admin)
CREATE TABLE platform_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. Machine à états d'une partie

```
LOBBY
  → (tous les joueurs ont rejoint + payé leur mise)
COLLECTING_STAKES
  → (tous confirmés)
IN_PROGRESS
  → un joueur fait Million → FINISHED (gagnant = ce joueur)
  → tous ont lancé, un seul max → FINISHED (gagnant = celui-là)
  → tous ont lancé, égalité au max → CANCELLED_TIE → nouveau round → retour à IN_PROGRESS
     (round_number += 1, dice1/dice2/has_rolled remis à zéro pour tous, pot inchangé)
FINISHED
  → payout (pot - commission) crédité au gagnant
  → commission enregistrée dans platform_revenue
```

---

## 7. Événements WebSocket (contrat Socket.io)

### Émis par le client :
- `room:create` `{ stakeAmount }`
- `room:join` `{ roomCode }`
- `room:confirmStake` `{ roomId }`
- `dice:roll` `{ roomId }` (le joueur dont c'est le tour)

### Émis par le serveur :
- `room:state` — état complet de la room (joueurs, statut, pot) à chaque changement
- `room:playerJoined` `{ player }`
- `stake:collected` `{ playerId, potTotal }`
- `game:started`
- `dice:rolling` `{ playerId }` — déclenche l'animation chez tout le monde
- `dice:result` `{ playerId, dice1, dice2, score, isMillion }`
- `game:roundTie` `{ tiedPlayerIds }` — annulation et relance
- `game:finished` `{ winnerId, potTotal, commission, netPayout }`
- `error` `{ code, message }`

---

## 8. Structure de projet suggérée

```
jambo/
├── frontend/                 # PWA React
│   ├── public/
│   │   ├── manifest.json
│   │   └── icons/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DiceAnimation.jsx
│   │   │   ├── RoomLobby.jsx
│   │   │   ├── GameTable.jsx
│   │   │   └── ScoreBoard.jsx
│   │   ├── hooks/
│   │   │   └── useSocket.js
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── CreateRoom.jsx
│   │   │   └── Game.jsx
│   │   └── App.jsx
│   ├── service-worker.js
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   ├── game/
│   │   │   ├── gameEngine.js      # toute la logique de règles (§2)
│   │   │   ├── diceRoller.js      # RNG sécurisé
│   │   │   └── gameStateMachine.js
│   │   ├── sockets/
│   │   │   └── gameSocket.js      # handlers Socket.io
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   └── users.js
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   └── models/
│   │   └── server.js
│   └── package.json
└── README.md
```

---

## 9. Sécurité et anti-triche

- RNG uniquement côté serveur (voir §3.2) — non négociable.
- Validation systématique côté serveur : un joueur ne peut envoyer `dice:roll` que si c'est effectivement son tour (`turn_order` courant) et qu'il a bien payé sa mise.
- Rate-limiting sur les WebSockets pour éviter le spam d'événements.
- JWT avec expiration courte + refresh token.
- Un joueur ne peut rejoindre qu'une seule fois une room (vérifier `user_id` unique par `game_id`).
- Toutes les mises/paiements de jetons doivent être des transactions atomiques (transaction SQL) pour éviter les incohérences de solde en cas de déconnexion au mauvais moment.

---

## 10. PWA — exigences techniques

- `manifest.json` avec icônes 192x192 et 512x512, `display: standalone`, thème couleur adapté à l'identité visuelle Jambo.
- Service worker : mise en cache des assets statiques (JS/CSS/images des dés) pour un chargement rapide même en réseau faible (contexte réseau mobile camerounais, souvent 3G).
- Fonctionnement WebSocket avec reconnexion automatique en cas de coupure réseau (fréquent en mobilité) — le joueur doit pouvoir revenir dans sa room en cours sans perdre sa progression.

---

## 11. Phases de développement

### Phase 1 — MVP jetons virtuels (objet de ce document)
1. Auth simple (numéro de téléphone + OTP, ou compte test sans OTP pour dev)
2. Création/jonction de room
3. Logique de jeu complète côté serveur (règles §2) avec tests unitaires sur : Million, égalité/annulation, calcul de commission
4. Animation des dés temps réel synchronisée
5. Historique des parties et solde de jetons par utilisateur
6. Dashboard admin basique (revenu plateforme cumulé via `platform_revenue`)

### Phase 2 — Argent réel (à ne démarrer qu'après clarification légale)
1. Intégration Orange Money API (Collections + Disbursements)
2. Intégration MTN MoMo API (Collections + Disbursements)
3. KYC minimal (nom, numéro, pièce d'identité selon exigence réglementaire)
4. Conformité déclaration d'activité / autorisation auprès du Ministère en charge des jeux (démarche administrative, hors scope code)
5. Séquestre des fonds réels le temps de la partie + réconciliation comptable

---

## 12. Ce que l'agent IA doit produire concrètement (checklist de livraison)

- [ ] Repo backend Node.js/Express + Socket.io, avec `gameEngine.js` couvrant 100 % des règles du §2 (tests unitaires inclus)
- [ ] Schéma PostgreSQL (§5) + migrations
- [ ] Repo frontend React PWA installable, avec animation de dés fonctionnelle et synchronisée
- [ ] Contrat d'événements Socket.io respecté à la lettre (§7)
- [ ] Système de jetons virtuels : solde, débit à la mise, crédit au gain net (pot - 10 %)
- [ ] Écran de résultat de partie affichant clairement : pot total, commission prélevée, gain net du gagnant
- [ ] Gestion de la reconnexion en cours de partie
- [ ] README avec instructions de lancement local (docker-compose recommandé pour Postgres + Redis)
