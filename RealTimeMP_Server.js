/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         RealTimeMP Server — GDevelop 5 Multiplayer          ║
 * ║                  Node.js + WebSocket (ws)                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * التثبيت والتشغيل:
 *   npm install ws
 *   node RealTimeMP_Server.js
 *
 * للنشر المجاني:
 *   - Railway : railway.app (مجاني)
 *   - Render  : render.com  (مجاني)
 *   - Glitch  : glitch.com  (مجاني)
 *   - Fly.io  : fly.io      (مجاني)
 *
 * المتغيرات البيئية (اختيارية):
 *   PORT          = منفذ الخادم (افتراضي 8080)
 *   MAX_ROOMS     = أقصى عدد غرف (افتراضي 100)
 *   MAX_PLAYERS   = أقصى لاعبين في الغرفة (افتراضي 16)
 *   PING_INTERVAL = مدة البينج بالمللي ثانية (افتراضي 2000)
 */

const WebSocket = require('ws');

// ─── إعدادات ─────────────────────────────────────────────────
const PORT          = parseInt(process.env.PORT)          || 8080;
const MAX_ROOMS     = parseInt(process.env.MAX_ROOMS)     || 100;
const MAX_PLAYERS   = parseInt(process.env.MAX_PLAYERS)   || 16;
const PING_INTERVAL = parseInt(process.env.PING_INTERVAL) || 2000;

// ─── الحالة العامة ────────────────────────────────────────────
/** @type {Map<string, Player>} */
const players = new Map();

/** @type {Map<string, Room>} */
const rooms = new Map();

let playerIdCounter = 0;
let roomIdCounter   = 0;

// ─── أنواع ────────────────────────────────────────────────────
/**
 * @typedef {{ id:string, name:string, room:string|null, ws:WebSocket, pingTimer:NodeJS.Timeout|null }} Player
 * @typedef {{ id:string, name:string, host:string, players:Set<string>, variables:Object, password:string, maxPlayers:number, isPrivate:boolean, createdAt:number }} Room
 */

// ─── مساعدات ─────────────────────────────────────────────────
function uid(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
}

function sendTo(playerId, msg) {
    const p = players.get(playerId);
    if (p && p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(JSON.stringify(msg));
    }
}

function broadcast(roomId, msg, excludeId = null) {
    const room = rooms.get(roomId);
    if (!room) return;
    const str = JSON.stringify(msg);
    for (const pid of room.players) {
        if (pid === excludeId) continue;
        const p = players.get(pid);
        if (p && p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(str);
        }
    }
}

function broadcastAll(roomId, msg) {
    broadcast(roomId, msg, null);
}

function getRoomSnapshot(room) {
    const playerData = {};
    for (const pid of room.players) {
        const p = players.get(pid);
        if (p) playerData[pid] = { name: p.name };
    }
    return playerData;
}

function removePlayerFromRoom(player) {
    if (!player.room) return;
    const roomId = player.room;
    const room   = rooms.get(roomId);
    player.room  = null;

    if (!room) return;
    room.players.delete(player.id);
    broadcast(roomId, { type: 'player_left', playerId: player.id });

    if (room.players.size === 0) {
        rooms.delete(roomId);
        log(`Room deleted (empty): ${roomId}`);
        return;
    }

    // Host migration
    if (room.host === player.id) {
        room.host = [...room.players][0];
        broadcastAll(roomId, { type: 'host_changed', newHostId: room.host });
        log(`Host migrated to ${room.host} in room ${roomId}`);
    }
}

function log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ─── معالج الرسائل ────────────────────────────────────────────
function handleMessage(player, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const t = msg.type;

    // ── تعريف اللاعب ──────────────────────────────────────────
    if (t === 'identify') {
        player.name = (msg.name || 'Player').slice(0, 32);
        log(`Player identified: ${player.id} as "${player.name}"`);
    }

    // ── بينج ──────────────────────────────────────────────────
    else if (t === 'ping') {
        sendTo(player.id, { type: 'pong', t: msg.t });
    }

    // ── إنشاء غرفة ────────────────────────────────────────────
    else if (t === 'create_room') {
        if (rooms.size >= MAX_ROOMS) {
            sendTo(player.id, { type: 'error', message: 'Server is full, cannot create more rooms.' });
            return;
        }
        if (player.room) removePlayerFromRoom(player);

        const roomId   = uid('room');
        const roomName = (msg.roomName || `Room_${roomIdCounter++}`).slice(0, 64);
        const maxP     = Math.min(parseInt(msg.maxPlayers) || MAX_PLAYERS, MAX_PLAYERS);
        const password = (msg.password || '').slice(0, 32);

        /** @type {Room} */
        const room = {
            id:        roomId,
            name:      roomName,
            host:      player.id,
            players:   new Set([player.id]),
            variables: {},
            password,
            maxPlayers: maxP,
            isPrivate:  !!msg.isPrivate,
            createdAt:  Date.now()
        };
        rooms.set(roomId, room);
        player.room = roomId;

        sendTo(player.id, {
            type:      'room_joined',
            roomId,
            isHost:    true,
            players:   getRoomSnapshot(room),
            variables: room.variables
        });
        log(`Room created: "${roomName}" (${roomId}) by ${player.id}`);
    }

    // ── الانضمام لغرفة ────────────────────────────────────────
    else if (t === 'join_room') {
        const room = rooms.get(msg.roomId);
        if (!room) {
            sendTo(player.id, { type: 'error', message: 'Room not found.' });
            return;
        }
        if (room.password && room.password !== (msg.password || '')) {
            sendTo(player.id, { type: 'error', message: 'Wrong password.' });
            return;
        }
        if (room.players.size >= room.maxPlayers) {
            sendTo(player.id, { type: 'error', message: 'Room is full.' });
            return;
        }
        if (player.room) removePlayerFromRoom(player);

        room.players.add(player.id);
        player.room = room.id;

        sendTo(player.id, {
            type:      'room_joined',
            roomId:    room.id,
            isHost:    player.id === room.host,
            players:   getRoomSnapshot(room),
            variables: room.variables
        });

        broadcast(room.id, {
            type:       'player_joined',
            playerId:   player.id,
            playerName: player.name,
            playerData: { name: player.name }
        }, player.id);

        log(`Player ${player.id} ("${player.name}") joined room "${room.name}"`);
    }

    // ── مغادرة الغرفة ────────────────────────────────────────
    else if (t === 'leave_room') {
        if (!player.room) return;
        removePlayerFromRoom(player);
        sendTo(player.id, { type: 'room_left' });
    }

    // ── إرسال حالة اللاعب ────────────────────────────────────
    else if (t === 'player_state') {
        if (player.room) {
            broadcast(player.room, {
                type:     'player_state',
                playerId: player.id,
                state:    msg.state || {}
            }, player.id);
        }
    }

    // ── حدث مخصص ─────────────────────────────────────────────
    else if (t === 'custom_event') {
        const payload = {
            type:     'custom_event',
            name:     msg.name     || '',
            data:     msg.data     || '',
            senderId: player.id
        };
        if (msg.target && msg.target !== '') {
            sendTo(msg.target, payload);
        } else if (player.room) {
            broadcast(player.room, payload, player.id);
        }
    }

    // ── استدعاء دالة عن بُعد (RPC) ──────────────────────────
    else if (t === 'rpc') {
        const payload = {
            type:     'rpc',
            name:     msg.name     || '',
            args:     msg.args     || [],
            senderId: player.id
        };
        if (msg.target && msg.target !== '') {
            sendTo(msg.target, payload);
        } else if (player.room) {
            broadcast(player.room, payload, player.id);
        }
    }

    // ── دردشة ────────────────────────────────────────────────
    else if (t === 'chat') {
        if (player.room) {
            broadcastAll(player.room, {
                type:       'chat',
                senderId:   player.id,
                senderName: player.name,
                text:       (msg.text || '').slice(0, 512)
            });
        }
    }

    // ── متغير الغرفة ─────────────────────────────────────────
    else if (t === 'room_variable') {
        if (!player.room) return;
        const room = rooms.get(player.room);
        if (!room) return;
        const key   = String(msg.key   || '').slice(0, 64);
        const value = msg.value !== undefined ? msg.value : '';
        room.variables[key] = value;
        broadcastAll(player.room, { type: 'room_variable', key, value });
    }

    // ── مزامنة كائن ──────────────────────────────────────────
    else if (t === 'object_sync') {
        if (player.room) {
            broadcast(player.room, {
                type:    'object_sync',
                objects: msg.objects || {}
            }, player.id);
        }
    }

    // ── قائمة اللوبي ─────────────────────────────────────────
    else if (t === 'get_lobby') {
        const list = [];
        for (const [, room] of rooms) {
            if (!room.isPrivate) {
                list.push({
                    id:          room.id,
                    name:        room.name,
                    playerCount: room.players.size,
                    maxPlayers:  room.maxPlayers,
                    locked:      room.password !== ''
                });
            }
        }
        sendTo(player.id, { type: 'lobby_list', rooms: list });
    }

    // ── طرد لاعب (هوست فقط) ──────────────────────────────────
    else if (t === 'kick') {
        if (!player.room) return;
        const room = rooms.get(player.room);
        if (!room || room.host !== player.id) return;

        const targetId = msg.targetId;
        const reason   = (msg.reason || '').slice(0, 128);
        const target   = players.get(targetId);

        if (!target) return;
        sendTo(targetId, { type: 'kicked', reason });
        removePlayerFromRoom(target);
        if (target.ws.readyState === WebSocket.OPEN) target.ws.close(1000, 'Kicked');
        log(`Player ${targetId} kicked from room ${room.id} by host ${player.id}. Reason: ${reason}`);
    }
}

// ─── الخادم ──────────────────────────────────────────────────
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
    const playerId = `p${++playerIdCounter}`;
    /** @type {Player} */
    const player = {
        id:        playerId,
        name:      'Player',
        room:      null,
        ws,
        pingTimer: null
    };
    players.set(playerId, player);

    // إرسال ترحيب
    ws.send(JSON.stringify({ type: 'welcome', playerId }));
    log(`Player connected: ${playerId} (total: ${players.size})`);

    // معالجة الرسائل
    ws.on('message', (raw) => {
        handleMessage(player, raw.toString());
    });

    // قطع الاتصال
    ws.on('close', () => {
        removePlayerFromRoom(player);
        players.delete(playerId);
        log(`Player disconnected: ${playerId} (total: ${players.size})`);
    });

    ws.on('error', (err) => {
        log(`Error for player ${playerId}: ${err.message}`);
    });
});

log(`✅ RealTimeMP Server running on port ${PORT}`);
log(`   Max rooms: ${MAX_ROOMS} | Max players per room: ${MAX_PLAYERS}`);

// ─── تنظيف الغرف القديمة (كل 5 دقائق) ───────────────────────
setInterval(() => {
    const now = Date.now();
    const EXPIRE_MS = 60 * 60 * 1000; // ساعة واحدة
    for (const [id, room] of rooms) {
        if (room.players.size === 0 && now - room.createdAt > EXPIRE_MS) {
            rooms.delete(id);
            log(`Expired empty room deleted: ${id}`);
        }
    }
}, 5 * 60 * 1000);
