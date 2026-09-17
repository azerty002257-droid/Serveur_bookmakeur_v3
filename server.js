import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { getRawOdds } from './oddsProvider.js';
import { enrichEvents } from './oddsService.js';

const PORT = Number(process.env.PORT || 3000);
const CLIENT_API_KEY = process.env.CLIENT_API_KEY || 'change-me-please';
const REFRESH_INTERVAL = Number(process.env.REFRESH_INTERVAL || 15) * 1000;

const providerConfig = {
  apiKey: process.env.ODDS_API_KEY || '',
  sportKey: process.env.SPORT_KEY || 'soccer_france_ligue_one',
  region: process.env.ODDS_REGION || 'eu'
};

// Dernier instantane des cotes en memoire
let snapshot = { source: 'init', updatedAt: null, events: [] };

async function refreshOdds() {
  try {
    const { source, events } = await getRawOdds(providerConfig);
    snapshot = {
      source,
      updatedAt: new Date().toISOString(),
      events: enrichEvents(events)
    };
    io.to('odds').emit('odds:update', snapshot);
    console.log(`[odds] maj ${snapshot.events.length} matchs (${source})`);
  } catch (err) {
    console.error('[odds] erreur de rafraichissement:', err.message);
  }
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Middleware d'authentification par cle partagee
function requireKey(req, res, next) {
  const key = req.header('x-api-key') || req.query.apiKey;
  if (key !== CLIENT_API_KEY) {
    return res.status(401).json({ error: 'Cle API invalide ou absente' });
  }
  next();
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Endpoint REST : recuperer le dernier instantane des cotes
app.get('/api/odds', requireKey, (_req, res) => res.json(snapshot));

const server = http.createServer(app);
const io = new SocketServer(server, { cors: { origin: '*' } });

// Authentification des connexions WebSocket
io.use((socket, next) => {
  const key = socket.handshake.auth?.apiKey || socket.handshake.query?.apiKey;
  if (key !== CLIENT_API_KEY) return next(new Error('Cle API invalide'));
  next();
});

io.on('connection', (socket) => {
  socket.join('odds');
  console.log('[ws] client connecte:', socket.id);
  // Envoi immediat du dernier instantane connu
  socket.emit('odds:update', snapshot);
  socket.on('disconnect', () => console.log('[ws] deconnecte:', socket.id));
});

// Ecoute uniquement en local par defaut (securite).
// Passez HOST=0.0.0.0 seulement derriere un reverse-proxy/HTTPS controle.
const HOST = process.env.HOST || '127.0.0.1';
server.listen(PORT, HOST, () => {
  console.log(`Serveur bookmaker sur http://${HOST}:${PORT}`);
  console.log(providerConfig.apiKey ? '[mode LIVE]' : '[mode DEMO - cotes simulees]');
  refreshOdds();
  setInterval(refreshOdds, REFRESH_INTERVAL);
});
