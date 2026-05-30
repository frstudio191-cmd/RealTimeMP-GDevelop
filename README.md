# 🌐 RealTimeMP — Real-Time Multiplayer Extension for GDevelop 5

> **Open Source · Free · Fully Customizable · No External Server Required**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GDevelop](https://img.shields.io/badge/GDevelop-5.x-blue.svg)](https://gdevelop.io)
[![Version](https://img.shields.io/badge/Version-1.0.0-orange.svg)]()

---

## 📖 Table of Contents

1. [What is RealTimeMP?](#what-is-realtimemp)
2. [Why RealTimeMP?](#why-realtimemp)
3. [How It Works](#how-it-works)
4. [Package Contents](#package-contents)
5. [Installation](#installation)
6. [Server Setup](#server-setup)
7. [Quick Start](#quick-start)
8. [Full API Reference](#full-api-reference)
9. [Step-by-Step Use Cases](#step-by-step-use-cases)
10. [Free Hosting Options](#free-hosting-options)
11. [Architecture Deep Dive](#architecture-deep-dive)
12. [Contributing](#contributing)
13. [License](#license)

---

## What is RealTimeMP?

**RealTimeMP** is a complete, open-source real-time multiplayer extension for **GDevelop 5**. It lets you add online multiplayer to any GDevelop game — platformers, top-down shooters, racing games, card games, and more — without any paid service or proprietary server.

Built on the **WebSocket** protocol for fast, bidirectional, real-time communication between players.

---

## Why RealTimeMP?

| Feature | RealTimeMP | Old OnlineMultiplayer Extension |
|---|---|---|
| Your own server | ✅ Full control | ❌ Locked to external server |
| Open source code | ✅ Read & modify everything | ❌ Obfuscated / closed |
| Room system | ✅ Full lobby + rooms | ❌ Basic or none |
| Custom events | ✅ Unlimited | ❌ Very limited |
| RPC (Remote Calls) | ✅ Built-in | ❌ Not available |
| In-game chat | ✅ Built-in | ❌ Not available |
| Host migration | ✅ Automatic | ❌ Not available |
| Ping measurement | ✅ Per player | ❌ Not available |
| Actively maintained | ✅ Open source | ❌ Abandoned |
| Cost | ✅ Free forever | ❌ Depends on service |

---

## How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Your Game                            │
│                                                             │
│   Player 1 (GDevelop)          Player 2 (GDevelop)         │
│   ┌──────────────────┐         ┌──────────────────┐        │
│   │  RealTimeMP.json │         │  RealTimeMP.json │        │
│   │   (Extension)    │         │   (Extension)    │        │
│   └────────┬─────────┘         └────────┬─────────┘        │
│            │ WebSocket                  │ WebSocket         │
│            │                            │                   │
│   ┌────────▼────────────────────────────▼─────────┐        │
│   │            RealTimeMP_Server.js               │        │
│   │              (Node.js Server)                 │        │
│   │  - Manages players and rooms                  │        │
│   │  - Routes messages between players            │        │
│   │  - Handles disconnections & host migration    │        │
│   └───────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Message Flow (what happens when a player moves)

```
1. Player moves their character
2. GDevelop calls: Send player state (X, Y, Angle)
3. Extension sends JSON to server:
   { "type": "player_state", "state": { "x": 320, "y": 150, "angle": 45 } }
4. Server receives the message
5. Server broadcasts to ALL other players in the same room:
   { "type": "player_state", "playerId": "p1", "state": { "x": 320, ... } }
6. Other players' games receive the update
7. GDevelop reads: PlayerX("p1"), PlayerY("p1")
8. Other players see the movement on screen
```

### Internal State Object

The extension stores all multiplayer state in `gdjs.RealTimeMP`:

```javascript
gdjs.RealTimeMP = {
    socket: WebSocket,          // Connection to the server
    connectionStatus: string,   // "disconnected"|"connecting"|"connected"|"error"
    playerId: string,           // This player's unique ID (e.g. "p1")
    playerName: string,         // This player's display name
    roomId: string,             // Current room ID
    isHost: boolean,            // Is this player the room host?
    roomPlayers: {},            // { playerId: { x, y, angle, name, data, latency } }
    roomVariables: {},          // Shared variables: { key: value }
    customEvents: [],           // Queue of received custom events
    rpcQueue: [],               // Queue of received RPC calls
    chatMessages: [],           // Queue of chat messages
    lobbyRooms: [],             // Available rooms from server
    latency: number,            // This player's ping in ms
}
```

---

## Package Contents

```
RealTimeMP/
├── RealTimeMP.json          ← GDevelop extension (import this into your project)
├── RealTimeMP_Server.js     ← Node.js server (run this on your machine or cloud)
└── README.md                ← This file
```

---

## Installation

### Step 1 — Import the Extension

1. Open your project in **GDevelop 5**
2. Click **Project Manager** (top-left)
3. Click **Extensions**
4. Click **Import extension** (folder icon)
5. Select `RealTimeMP.json`

### Step 2 — Verify

After importing, add an Action and look for:
```
Network → RealTimeMP - Real-Time Multiplayer
  ├── Actions (19)
  ├── Conditions (18)
  └── Expressions (35)
```

---

## Server Setup

### Requirements
- **Node.js** v14+ → [nodejs.org](https://nodejs.org)
- `ws` library (installed via npm)

### Run Locally

```bash
mkdir my-server && cd my-server
# copy RealTimeMP_Server.js here
npm init -y
npm install ws
node RealTimeMP_Server.js
```

Expected output:
```
✅ RealTimeMP Server running on port 8080
   Max rooms: 100 | Max players per room: 16
```

Server is now at: `ws://localhost:8080`

### Environment Variables

```bash
PORT=3000 MAX_ROOMS=50 MAX_PLAYERS=8 node RealTimeMP_Server.js
```

---

## Quick Start

Minimum events to get two players visible to each other:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVENT 1 — Connect on scene start
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Trigger: At the beginning of the scene
Action:  Connect to server "ws://localhost:8080" as player "Player1"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVENT 2 — Request lobby list after connecting
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Condition: Just connected to server
Action:    Request lobby list from server

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVENT 3 — Create or join after 0.5s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Condition: Timer "LobbyWait" >= 0.5
Condition: Is connected to server
Condition: NOT Is in a room

  SUB-EVENT A:
  Condition: LobbyRoomCount() = 0
  Action:    Create room "My Game" max 10 password "" private "false"

  SUB-EVENT B:
  Condition: LobbyRoomCount() > 0
  Action:    Join room LobbyRoomId(0) password ""

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVENT 4 — Save room ID
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Condition: Just joined a room
Action:    Scene variable "RoomId" = RealTimeMP::RoomId()

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVENT 5 — Send my position every frame
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Condition: Is connected to server
Action:    Send player state X:Player.X() Y:Player.Y() Angle:Player.Angle() Data:""

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVENT 6 — Spawn object for player who joined
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Condition: A player just joined the room
Action:    Create object OtherPlayer at (0, 0)
Action:    OtherPlayer.Variable("pid") = PlayerJustJoinedId()

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVENT 7 — Move other players every frame
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(No condition)
Action: OtherPlayer.SetX( PlayerX(OtherPlayer.Variable("pid")) )
Action: OtherPlayer.SetY( PlayerY(OtherPlayer.Variable("pid")) )
Action: OtherPlayer.SetAngle( PlayerAngle(OtherPlayer.Variable("pid")) )

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVENT 8 — Remove object when player leaves
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Condition: A player just left the room
Action:    Delete OtherPlayer where Variable("pid") = PlayerJustLeftId()
```

---

## Full API Reference

### Actions

**Connection**
| Action | Parameters | Description |
|--------|-----------|-------------|
| Connect to server | serverUrl, playerName | Connect via WebSocket. Use `ws://` locally, `wss://` on HTTPS servers. |
| Disconnect | — | Cleanly close the connection. |

**Rooms**
| Action | Parameters | Description |
|--------|-----------|-------------|
| Create room | name, maxPlayers, password, isPrivate | Create a room. You become host. |
| Join room | roomId, password | Join by room ID. |
| Leave room | — | Leave current room. |
| Request lobby list | — | Get list of public rooms from server. |

**Gameplay**
| Action | Parameters | Description |
|--------|-----------|-------------|
| Send player state | x, y, angle, customData | Send position. Call every frame. |
| Send custom event | name, data, targetId | Named event with payload. Empty target = broadcast. |
| Call RPC | name, argsJson, targetId | Call a function on other clients. Args must be a JSON array string. |
| Set room variable | key, value | Set a shared variable for all players. |
| Send chat message | text | Send text to all players in room. |
| Sync object | id, x, y, angle, extraData | Sync a game object. Host only. |
| Kick player | playerId, reason | Remove a player. Host only. |

**Queue Management**
| Action | Description |
|--------|-------------|
| Mark custom event as handled | Pop from queue. Always call after processing. |
| Mark RPC as handled | Pop from queue. Always call after processing. |
| Mark chat message as read | Pop from queue. Always call after reading. |

---

### Conditions

| Condition | Description |
|-----------|-------------|
| Is connected | Every frame while connected. |
| Is connecting | While connecting. |
| Is disconnected | When not connected. |
| Has connection error | After an error. |
| Is in a room | While inside a room. |
| Is room host | This player is the host. |
| Just connected | One frame only. |
| Just disconnected | One frame only. |
| Just joined a room | One frame only. |
| Just left a room | One frame only. |
| A player just joined | One frame only. |
| A player just left | One frame only. |
| Host player changed | One frame only. |
| Custom event received | Queue not empty. |
| Current event name is | Check front of queue. |
| RPC call received | RPC queue not empty. |
| Current RPC name is | Check RPC queue. |
| Chat message received | Chat queue not empty. |

---

### Expressions

**My Player**
- `MyPlayerId()` — Unique server-assigned ID
- `MyPlayerName()` — My display name
- `RoomId()` — Current room ID
- `ConnectionStatus()` — disconnected / connecting / connected / error
- `LastError()` — Last error message
- `Latency()` — My ping in ms
- `PlayerCount()` — Players in current room

**Other Players**
- `PlayerX(id)` / `PlayerY(id)` / `PlayerAngle(id)`
- `PlayerName(id)` / `PlayerData(id)` / `PlayerLatency(id)`
- `AllPlayerIds()` — JSON array string of all player IDs

**Events/RPC/Chat**
- `CurrentEventName()` / `CurrentEventData()` / `CurrentEventSender()`
- `CurrentRPCName()` / `CurrentRPCArgs()` / `CurrentRPCSender()`
- `ChatText()` / `ChatSenderName()` / `ChatSenderId()`

**Join/Leave**
- `PlayerJustJoinedId()` / `PlayerJustLeftId()` / `NewHostId()`

**Lobby**
- `LobbyRoomCount()`
- `LobbyRoomId(i)` / `LobbyRoomName(i)` / `LobbyRoomPlayerCount(i)` / `LobbyRoomMaxPlayers(i)`

**Synced Objects**
- `SyncedObjectX(id)` / `SyncedObjectY(id)` / `SyncedObjectAngle(id)`

**Room Variables**
- `RoomVariableValue(key)`

---

## Step-by-Step Use Cases

### 1 — Sending Player Health with Position

```
Send player state
  Data: ToString(PlayerHealth)

Read it back:
  OtherPlayer.Variable("health") = ToNumber( PlayerData(OtherPlayer.Variable("pid")) )

Multiple values — use comma separator:
  Data: ToString(Health) + "," + ToString(Score)
```

### 2 — Custom Events (e.g. Bullet Fired)

```
[Space pressed]
→ Send custom event  Name:"Shoot"  Data:ToString(Player.X())+","+ToString(Player.Y())

[Custom event received]
[Current event name is "Shoot"]
→ Create Bullet at (ToNumber(StrBefore(CurrentEventData(),",")), ...)
→ Mark custom event as handled
```

### 3 — Shared Room Variables (e.g. Round Timer)

```
[Is host AND Timer >= 1]
→ Set room variable "RoundTime" to ToString(ToNumber(RoomVariableValue("RoundTime")) - 1)

[Any player]
→ TimerText.SetString( RoomVariableValue("RoundTime") )
```

### 4 — In-Game Chat

```
[Enter pressed]
→ Send chat message  Text: ChatInput.String()
→ ChatInput.SetString("")

[Chat message received]
→ ChatLog += ChatSenderName() + ": " + ChatText() + newline
→ Mark chat message as read
```

### 5 — Host-Only Enemy Spawning

```
[Is host AND Timer "Spawn" >= 3]
→ Create Enemy at random position
→ Sync object "Enemy1" X:Enemy.X() Y:Enemy.Y()
→ Reset timer "Spawn"

[NOT Is host]
→ Enemy.SetX( SyncedObjectX("Enemy1") )
→ Enemy.SetY( SyncedObjectY("Enemy1") )
```

### 6 — RPC (Remote Procedure Calls)

```
[Player shoots another player]
→ Call RPC  Name:"TakeDamage"  Args:"[50]"  Target:HitPlayerId

[RPC received]
[Current RPC name is "TakeDamage"]
→ PlayerHealth -= 50
→ Mark RPC as handled
```

---

## Free Hosting Options

### Railway (Recommended)
1. Sign up at [railway.app](https://railway.app)
2. New project → upload files with this `package.json`:
```json
{
  "name": "realtimemp-server",
  "scripts": { "start": "node RealTimeMP_Server.js" },
  "dependencies": { "ws": "^8.0.0" }
}
```
3. Deploy → get URL
4. In GDevelop use: `wss://your-app.railway.app`

### Render
1. Sign up at [render.com](https://render.com)
2. New → Web Service → connect repo
3. Start command: `node RealTimeMP_Server.js`
4. Use: `wss://your-app.onrender.com`

### Glitch (Fastest for testing)
1. [glitch.com](https://glitch.com) → New Project → hello-express
2. Paste server code into `server.js`
3. Add `"ws": "^8.0.0"` to `package.json` dependencies
4. Use: `wss://your-project.glitch.me`

### Local Network (same WiFi)
1. Find your IP: Windows → `ipconfig`, Mac/Linux → `ifconfig`
2. Friend connects to: `ws://192.168.1.X:8080`

> ⚠️ Always use `wss://` (with the extra s) when your game is hosted on HTTPS.

---

## Architecture Deep Dive

### Initialization
The extension uses GDevelop's `onFirstSceneLoaded` lifecycle to create `gdjs.RealTimeMP` once per scene. This sets up all state variables and message handlers.

### One-Frame Flags
Flags like `justConnected` and `playerJustJoined` are set to `true` when an event occurs. The `onScenePostEvents` lifecycle resets all flags to `false` at the end of every frame. This ensures conditions fire for exactly one frame.

### Message Queue System
Custom events, RPC calls, and chat messages use JavaScript arrays as queues. New messages are pushed to the front. "Mark as handled" pops from the array. This allows processing multiple events in a single frame using sub-events.

### Host Migration
When the host disconnects, the server automatically promotes the next player in the room and broadcasts `host_changed`. The extension sets `isHost = true` on the new host's client and fires the `HostChanged` condition for one frame.

### Ping Measurement
Every 2 seconds the client sends a `ping` message with the current timestamp. The server immediately replies with a `pong` containing the same timestamp. The client calculates `latency = (now - sentTime) / 2`.

---

## Contributing

MIT licensed. You are free to use, modify, and redistribute this in any project.

**Ideas for new features:**
- Voice chat (WebRTC)
- Lag compensation / client-side prediction
- Matchmaking
- Spectator mode
- Replay system
- Game state snapshots for late joiners

---

## License

MIT License — Copyright (c) 2025 RealTimeMP Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, without restriction, subject to including this copyright notice in all copies.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.

---

*Built with love for the GDevelop open-source community*
