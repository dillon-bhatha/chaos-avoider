const http = require('http');
const { WebSocketServer } = require('ws');

const server = http.createServer();
const wss = new WebSocketServer({ server });
const rooms = new Map();

function genCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function relay(ws, data) {
  const room = rooms.get(ws.roomCode);
  if (!room) return;
  const other = ws.isHost ? room.guest : room.host;
  if (other?.readyState === 1) other.send(JSON.stringify(data));
}

wss.on('connection', ws => {
  ws.roomCode = null;
  ws.isHost = false;

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'create') {
      const code = genCode();
      const seed = (Math.random() * 0xffffffff) >>> 0;
      rooms.set(code, { host: ws, guest: null, seed });
      ws.roomCode = code;
      ws.isHost = true;
      ws.send(JSON.stringify({ type: 'created', code, seed }));
    }

    else if (msg.type === 'join') {
      const code = (msg.code || '').toUpperCase();
      const room = rooms.get(code);
      if (!room) { ws.send(JSON.stringify({ type: 'error', msg: 'Room not found' })); return; }
      if (room.guest) { ws.send(JSON.stringify({ type: 'error', msg: 'Room is full' })); return; }
      room.guest = ws;
      ws.roomCode = code;
      ws.isHost = false;
      const start = JSON.stringify({ type: 'start', seed: room.seed });
      room.host.send(start);
      room.guest.send(start);
    }

    else if (msg.type === 'pos') relay(ws, { type: 'pos', x: msg.x, y: msg.y });
    else if (msg.type === 'die') relay(ws, { type: 'die' });
  });

  ws.on('close', () => {
    if (!ws.roomCode) return;
    const room = rooms.get(ws.roomCode);
    if (!room) return;
    const other = ws.isHost ? room.guest : room.host;
    if (other?.readyState === 1) other.send(JSON.stringify({ type: 'disconnect' }));
    rooms.delete(ws.roomCode);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`WebSocket server on port ${PORT}`));
