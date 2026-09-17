# Serveur Bookmaker - Cotes en Temps Reel

Serveur Node.js qui recupere les cotes sportives en temps reel, identifie l'equipe favorite et l'equipe a domicile, et diffuse les donnees vers votre application via WebSocket.

## Demarrage rapide

```bash
# 1. Installer les dependances
npm install

# 2. Configurer
cp .env.example .env
# Editez .env : au minimum changez CLIENT_API_KEY
# Si vous avez une cle The Odds API, ajoutez-la dans ODDS_API_KEY
# Sans cle, le serveur genere des cotes simulees (mode demo)

# 3. Lancer
npm start
```

Le serveur demarre sur http://127.0.0.1:3000

## Connexion depuis votre application

### Via WebSocket (recommande pour le temps reel)

```javascript
import { io } from 'socket.io-client';

const socket = io('http://127.0.0.1:3000', {
  auth: { apiKey: 'change-me-please' }  // votre CLIENT_API_KEY
});

// Ecoute les mises a jour de cotes en temps reel
socket.on('odds:update', (snapshot) => {
  console.log(snapshot);
  // snapshot.events = tableau des matchs enrichis
  // chaque match contient :
  //   home.team   -> nom equipe a domicile
  //   home.odd    -> cote moyenne domicile
  //   home.impliedProbability -> probabilite %
  //   home.isFavorite -> true si favori
  //   away.team   -> nom equipe a l'exterieur
  //   away.odd    -> cote moyenne exterieur
  //   away.isFavorite -> true si favori
  //   favorite    -> nom du favori global
  //   underdog    -> nom de l'outsider
});
```

### Via REST (pour recuperer le dernier instantane)

```bash
curl -H 'x-api-key: change-me-please' http://127.0.0.1:3000/api/odds
```

## Mode demo vs mode live

- **Sans ODDS_API_KEY** : le serveur genere des cotes simulees (4 matchs de Ligue 1). Parfait pour tester.
- **Avec ODDS_API_KEY** : le serveur interroge The Odds API (https://the-odds-api.com/) pour des cotes reelles. Creez un compte gratuit pour obtenir une cle (500 requetes/mois offertes).

## Variables d'environnement

| Variable | Defaut | Description |
|---|---|---|
| PORT | 3000 | Port d'ecoute |
| HOST | 127.0.0.1 | Interface d'ecoute (0.0.0.0 uniquement derriere reverse-proxy) |
| ODDS_API_KEY | (vide) | Cle The Odds API. Vide = mode demo |
| SPORT_KEY | soccer_france_ligue_one | Sport suivi (voir la doc The Odds API) |
| ODDS_REGION | eu | Region des cotes (eu, uk, us, au) |
| REFRESH_INTERVAL | 15 | Intervalle de rafraichissement (secondes) |
| CLIENT_API_KEY | change-me-please | Cle que votre application doit fournir |

## Interface web de test

Ouvrez http://127.0.0.1:3000?apiKey=change-me-please dans un navigateur pour voir les cotes en direct avec badges Favori/Domicile.
