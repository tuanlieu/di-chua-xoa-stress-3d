// Máy chủ Web + WebSocket Đa Người Chơi (Zero-Dependency Node.js Server)
// Phục vụ đồng thời:
//  - Cổng chọn phiên bản: http://localhost:3000/
//  - Phiên bản 1 (Đi Chùa Online): http://localhost:3000/chua-online/
//  - Phiên bản 2 (Đi Nhà Thờ Online): http://localhost:3000/nha-tho-online/
//  - Đồng bộ thời gian thực qua WebSocket (/ws) theo từng Chùa / Nhà Thờ & Mã Phòng (?room=...)

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.gz': 'application/octet-stream',
};

// Quản lý danh sách kết nối WebSocket theo từng phòng: key = `${theme}:${temple}:${room}`
const rooms = new Map();
const clients = new Map();

function getRoomKey(c) {
  return `${c.theme || 'temple'}:${c.temple || 'nhattru'}:${c.room || 'chung'}`;
}

function sendWs(socket, obj) {
  if (!socket || socket.destroyed || !socket.writable) return;
  try {
    const payload = Buffer.from(JSON.stringify(obj), 'utf8');
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.alloc(2);
      header[0] = 0x81; // FIN + text frame
      header[1] = len;
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    socket.write(Buffer.concat([header, payload]));
  } catch {}
}

function broadcastRoom(roomKey, msg, excludeSocket = null) {
  const set = rooms.get(roomKey);
  if (!set) return;
  for (const sock of set) {
    if (sock !== excludeSocket) sendWs(sock, msg);
  }
}

function removeClient(socket) {
  const info = clients.get(socket);
  if (!info) return;
  clients.delete(socket);
  if (info.roomKey && rooms.has(info.roomKey)) {
    const set = rooms.get(info.roomKey);
    set.delete(socket);
    if (set.size === 0) rooms.delete(info.roomKey);
    else if (info.peer?.id) {
      broadcastRoom(info.roomKey, { t: 'leave', id: info.peer.id }, socket);
    }
  }
}

function handleWsMessage(socket, rawText) {
  let msg;
  try { msg = JSON.parse(rawText); } catch { return; }
  const info = clients.get(socket);
  if (!info) return;

  if (msg.t === 'join' && msg.peer) {
    // Rời phòng cũ nếu đổi chùa/nhà thờ
    if (info.roomKey && rooms.has(info.roomKey)) {
      const oldSet = rooms.get(info.roomKey);
      oldSet.delete(socket);
      if (info.peer?.id) broadcastRoom(info.roomKey, { t: 'leave', id: info.peer.id }, socket);
    }
    info.theme = msg.theme || 'temple';
    info.temple = msg.temple || 'nhattru';
    info.room = msg.room || 'chung';
    info.peer = {
      ...msg.peer,
      x: msg.peer.x ?? 0,
      z: msg.peer.z ?? 6,
      ry: msg.peer.ry ?? Math.PI,
      state: msg.peer.state || 'idle',
      cushion: msg.peer.cushion ?? -1,
    };
    info.roomKey = getRoomKey(info);
    if (!rooms.has(info.roomKey)) rooms.set(info.roomKey, new Set());
    const roomSet = rooms.get(info.roomKey);
    roomSet.add(socket);

    // Gửi danh sách người thật đang ở trong cùng phòng cho người mới vào
    const existingPeers = [];
    for (const otherSock of roomSet) {
      if (otherSock !== socket) {
        const other = clients.get(otherSock);
        if (other?.peer) existingPeers.push(other.peer);
      }
    }
    if (existingPeers.length) {
      sendWs(socket, { t: 'peers', peers: existingPeers });
    }
    // Báo cho mọi người trong phòng biết có người mới vào
    broadcastRoom(info.roomKey, { t: 'join', peer: info.peer }, socket);
    return;
  }

  if (!info.roomKey || !info.peer) return;
  const id = info.peer.id;

  switch (msg.t) {
    case 'move':
      info.peer.x = msg.x;
      info.peer.z = msg.z;
      info.peer.ry = msg.ry;
      info.peer.state = 'walk';
      info.peer.cushion = -1;
      broadcastRoom(info.roomKey, { t: 'move', id, x: msg.x, z: msg.z, ry: msg.ry }, socket);
      break;
    case 'sit':
      info.peer.cushion = msg.cushion ?? -1;
      info.peer.state = info.peer.cushion >= 0 ? 'sit' : 'idle';
      broadcastRoom(info.roomKey, { t: 'sit', id, cushion: info.peer.cushion }, socket);
      break;
    case 'bow':
      info.peer.state = 'bow';
      broadcastRoom(info.roomKey, { t: 'bow', id }, socket);
      break;
    case 'chant':
      broadcastRoom(info.roomKey, { t: 'chant', id, text: msg.text }, socket);
      break;
    case 'offer':
      broadcastRoom(info.roomKey, { t: 'offer', id, name: info.peer.name, kind: msg.kind }, socket);
      break;
    case 'bell':
      broadcastRoom(info.roomKey, { t: 'bell', name: info.peer.name }, socket);
      break;
    case 'lantern':
      broadcastRoom(info.roomKey, { t: 'lantern', name: info.peer.name, wish: msg.wish || '' }, socket);
      break;
    case 'greet':
      broadcastRoom(info.roomKey, { t: 'greet', from: info.peer.name, to: msg.to, text: msg.text }, socket);
      break;
    case 'poke':
      broadcastRoom(info.roomKey, { t: 'poke', fromId: id, fromName: info.peer.name, toId: msg.to }, socket);
      break;
  }
}

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsed.pathname);

  // Endpoint kiểm tra trạng thái server & số phòng
  if (pathname === '/api/health' || pathname === '/api/rooms') {
    const summary = {};
    for (const [k, set] of rooms.entries()) summary[k] = set.size;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, onlineClients: clients.size, rooms: summary }));
    return;
  }

  // Hỗ trợ link chia sẻ /s/:id
  if (pathname.startsWith('/s/')) {
    res.writeHead(302, { Location: '/' });
    res.end();
    return;
  }

  // Điều hướng thư mục sang index.html
  if (pathname.endsWith('/')) pathname += 'index.html';
  else if (pathname === '/chua-online' || pathname === '/chua-xoa-stress') {
    res.writeHead(302, { Location: pathname + '/' + (parsed.search || '') });
    res.end();
    return;
  }

  const safePath = path.normalize(path.join(ROOT, pathname));
  if (!safePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(safePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(safePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(safePath).pipe(res);
  });
});

// Nâng cấp kết nối HTTP sang WebSocket RFC 6455 cho đường dẫn /ws
server.on('upgrade', (req, socket) => {
  const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (!parsed.pathname.endsWith('/ws')) {
    socket.destroy();
    return;
  }
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }
  const accept = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );

  clients.set(socket, { roomKey: null, peer: null });

  let buffer = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 2) {
      const firstByte = buffer[0];
      const secondByte = buffer[1];
      const opcode = firstByte & 0x0f;
      const isMasked = (secondByte & 0x80) !== 0;
      let payloadLen = secondByte & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (buffer.length < 4) return;
        payloadLen = buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (buffer.length < 10) return;
        payloadLen = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      const maskLen = isMasked ? 4 : 0;
      if (buffer.length < offset + maskLen + payloadLen) return;

      let payload = buffer.subarray(offset + maskLen, offset + maskLen + payloadLen);
      if (isMasked) {
        const mask = buffer.subarray(offset, offset + 4);
        const unmasked = Buffer.alloc(payloadLen);
        for (let i = 0; i < payloadLen; i++) unmasked[i] = payload[i] ^ mask[i % 4];
        payload = unmasked;
      }
      buffer = buffer.subarray(offset + maskLen + payloadLen);

      if (opcode === 0x8) {
        // Close frame
        removeClient(socket);
        socket.end();
        return;
      } else if (opcode === 0x9) {
        // Ping -> Pong
        socket.write(Buffer.from([0x8a, 0x00]));
      } else if (opcode === 0x1) {
        // Text frame
        handleWsMessage(socket, payload.toString('utf8'));
      }
    }
  });

  socket.on('close', () => removeClient(socket));
  socket.on('error', () => removeClient(socket));
});

server.listen(PORT, () => {
  console.log(`=============================================================`);
  console.log(`✨ Máy chủ Đi Chùa Online & Xõa Stress 3D đang chạy tại:`);
  console.log(`   👉 Cổng So Sánh 2 Bản  : http://localhost:${PORT}/`);
  console.log(`   🪷 Bản Cũ (Tịnh Tâm)   : http://localhost:${PORT}/chua-online/`);
  console.log(`   🔥 Bản Mới (Xõa Stress): http://localhost:${PORT}/chua-xoa-stress/`);
  console.log(`=============================================================`);
});
