import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SaveManager } from './logic/SaveManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

// Sirve también el frontend: abre http://localhost:3000 (los módulos ES no funcionan con file://)
app.use(express.static(path.join(__dirname, '../../frontend')));

const saves = new SaveManager();
const CLIENT = 'player_local_01';
const num = (v) => Number(v);

// Ejecuta una acción sobre la partida activa (o responde "no hay partida")
const withGame = (fn) => (req, res) => {
  if (!saves.game) return res.status(409).json({ success: false, noGame: true, error: 'No hay partida activa' });
  res.json(fn(saves.game, req.body || {}));
};

// ---- Slots / menú principal ----
app.get('/api/slots',        (req, res) => res.json(saves.list()));
app.post('/api/slots/new',   (req, res) => res.json(saves.create(num(req.body.slot), req.body.name)));
app.post('/api/slots/load',  (req, res) => res.json(saves.load(num(req.body.slot))));
app.post('/api/slots/delete',(req, res) => res.json(saves.remove(num(req.body.slot))));

// ---- Control de la partida ----
app.get('/api/state',        (req, res) => res.json(saves.game ? saves.game.getState() : { noGame: true }));
app.post('/api/game/pause',  withGame((g, b) => g.setPaused(!!b.paused)));
app.post('/api/game/restart',withGame((g) => { const r = g.restart(); saves.save(); return r; }));
app.post('/api/game/exit',   (req, res) => res.json(saves.exit()));

// ---- Cocina ----
app.post('/api/ingredient',  withGame((g, b) => g.addIngredient(CLIENT, b.ingredient)));
app.post('/api/clear',       withGame((g) => g.clearPlate(CLIENT)));
app.post('/api/serve',       withGame((g, b) => g.serveOrder(CLIENT, num(b.customerId))));
app.post('/api/store',       withGame((g, b) => g.storeDelivery(CLIENT, b.ingredient, b.place)));

// ---- Salón ----
app.post('/api/interact',    withGame((g, b) => g.interact(CLIENT, num(b.tableId), num(b.px), num(b.py))));

// ---- Ayudantes ----
app.post('/api/helpers/hire', withGame((g, b) => g.hireHelper(CLIENT, b.helper)));

// ---- Ordenador ----
app.post('/api/buy/ingredient', withGame((g, b) => g.buyIngredient(CLIENT, b.ingredient, b.qty)));
app.post('/api/buy/table',      withGame((g) => g.buyTable(CLIENT)));
app.post('/api/buy/chair',      withGame((g, b) => g.buyChair(CLIENT, num(b.tableId))));
app.post('/api/expand',         withGame((g) => g.expand(CLIENT)));
app.post('/api/customize',      withGame((g, b) => g.customize(CLIENT, b)));

app.use((err, req, res, next) => res.status(400).json({ success: false, error: 'Petición inválida' }));

// Autoguardado cada 5 s y al cerrar el servidor
setInterval(() => saves.save(), 5000);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { saves.save(); process.exit(0); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Izakaya Backend Autoritativo corriendo en http://localhost:${PORT}`);
});
