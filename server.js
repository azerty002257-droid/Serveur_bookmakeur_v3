import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { Server as SocketServer } from 'socket.io';

import { getRawOdds } from './oddsProvider.js';
import { enrichEvents } from './oddsService.js';

const PORT = Number(process.env.PORT || 3000);

const CLIENT_API_KEY =
  process.env.CLIENT_API_KEY || 'change-me-please';

const REFRESH_INTERVAL =
  Number(process.env.REFRESH_INTERVAL || 15) * 1000;

// Configuration SportMonks
const providerConfig = {
  apiKey: process.env.SPORTMONKS_API_KEY || ''
};

// Dernier instantané des données
let snapshot = {
  source: 'init',
  updatedAt: null,
  events: [],
  error: null
};

// --------------------------------------------------
// RÉCUPÉRATION DES DONNÉES SPORTMONKS
// --------------------------------------------------

async function refreshOdds() {
  try {
    const { source, events } =
      await getRawOdds(providerConfig);

    snapshot = {
      source,
      updatedAt: new Date().toISOString(),
      events: enrichEvents(events),
      error: null
    };

    io.to('odds').emit(
      'odds:update',
      snapshot
    );

    console.log(
      `[sportmonks] maj ${snapshot.events.length} matchs`
    );

  } catch (err) {

    console.error(
      '[sportmonks] erreur:',
      err.message
    );

    snapshot = {
      ...snapshot,
      source: 'sportmonks',
      updatedAt: new Date().toISOString(),
      error: err.message
    };

    io.to('odds').emit(
      'odds:update',
      snapshot
    );
  }
}

// --------------------------------------------------
// EXPRESS
// --------------------------------------------------

const app = express();

app.use(cors());

app.use(express.json());

app.use(express.static('public'));

// --------------------------------------------------
// AUTHENTIFICATION CLIENT
// --------------------------------------------------

function requireKey(req, res, next) {

  const key =
    req.header('x-api-key') ||
    req.query.apiKey;

  if (key !== CLIENT_API_KEY) {

    return res
      .status(401)
      .json({
        error: 'Cle API invalide ou absente'
      });
  }

  next();
}

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get('/health', (_req, res) => {

  res.json({
    status: 'ok',
    service: 'Serveur SportMonks',
    sport: 'football',
    source: 'SportMonks',
    updatedAt: snapshot.updatedAt
  });

});

// --------------------------------------------------
// API DES MATCHS
// --------------------------------------------------

app.get(
  '/api/odds',
  requireKey,
  (_req, res) => {

    res.json(snapshot);

  }
);

// --------------------------------------------------
// SERVEUR HTTP
// --------------------------------------------------

const server =
  http.createServer(app);

// --------------------------------------------------
// WEBSOCKET
// --------------------------------------------------

const io =
  new SocketServer(server, {
    cors: {
      origin: '*'
    }
  });

// Authentification WebSocket
io.use((socket, next) => {

  const key =
    socket.handshake.auth?.apiKey ||
    socket.handshake.query?.apiKey;

  if (key !== CLIENT_API_KEY) {

    return next(
      new Error('Cle API invalide')
    );

  }

  next();

});

// Connexion client
io.on('connection', (socket) => {

  socket.join('odds');

  console.log(
    '[ws] client connecte:',
    socket.id
  );

  // Envoi immédiat des dernières données
  socket.emit(
    'odds:update',
    snapshot
  );

  socket.on(
    'disconnect',
    () => {

      console.log(
        '[ws] client deconnecte:',
        socket.id
      );

    }
  );

});

// --------------------------------------------------
// DÉMARRAGE DU SERVEUR
// --------------------------------------------------

// IMPORTANT POUR RENDER
const HOST = '0.0.0.0';

server.listen(
  PORT,
  HOST,
  () => {

    console.log(
      `Serveur SportMonks sur http://${HOST}:${PORT}`
    );

    if (providerConfig.apiKey) {

      console.log(
        '[mode SPORTMONKS]'
      );

    } else {

      console.log(
        '[ERREUR] SPORTMONKS_API_KEY absente'
      );

    }

    // Première récupération
    refreshOdds();

    // Actualisation automatique
    setInterval(
      refreshOdds,
      REFRESH_INTERVAL
    );

  }
);
