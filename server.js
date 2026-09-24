const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Load target words and allowed guesses
const targetWords = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'target_words.json'), 'utf-8'));
const allowedGuessesList = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'allowed_guesses.json'), 'utf-8'));
const allowedGuessesSet = new Set(allowedGuessesList.map(w => w.toLowerCase()));
// Ensure all target words are also allowed guesses
targetWords.forEach(w => allowedGuessesSet.add(w.toLowerCase()));

console.log(`Loaded ${targetWords.length} target words and ${allowedGuessesSet.size} allowed guesses.`);

// Serve static assets from public
app.use(express.static(path.join(__dirname, 'public')));

// In-memory rooms store
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function evaluateGuess(guess, target) {
  guess = guess.toLowerCase();
  target = target.toLowerCase();
  const result = new Array(5).fill('absent');
  const targetCounts = {};

  // Count target letters
  for (let i = 0; i < 5; i++) {
    const ch = target[i];
    targetCounts[ch] = (targetCounts[ch] || 0) + 1;
  }

  // First pass: mark correct (greens)
  for (let i = 0; i < 5; i++) {
    if (guess[i] === target[i]) {
      result[i] = 'correct';
      targetCounts[guess[i]]--;
    }
  }

  // Second pass: mark present (yellows)
  for (let i = 0; i < 5; i++) {
    if (result[i] !== 'correct') {
      const ch = guess[i];
      if (targetCounts[ch] && targetCounts[ch] > 0) {
        result[i] = 'present';
        targetCounts[ch]--;
      }
    }
  }

  return result;
}

function computeLeaderboard(room) {
  const players = Array.from(room.players.values());
  
  // Sort:
  // 1. Solved > Failed
  // 2. Least moves taken (numGuesses)
  // 3. Tie breaker: Time taken (finishTimeMs)
  const ranked = [...players].sort((a, b) => {
    const aSolved = a.status === 'solved';
    const bSolved = b.status === 'solved';
    if (aSolved !== bSolved) {
      return aSolved ? -1 : 1;
    }

    if (aSolved && bSolved) {
      if (a.numGuesses !== b.numGuesses) {
        return a.numGuesses - b.numGuesses;
      }
      return (a.finishTimeMs || 999999) - (b.finishTimeMs || 999999);
    }

    // Both failed: most guesses or less time
    if (a.numGuesses !== b.numGuesses) {
      return b.numGuesses - a.numGuesses;
    }
    return (a.finishTimeMs || 999999) - (b.finishTimeMs || 999999);
  });

  return ranked.map((p, idx) => ({
    rank: idx + 1,
    id: p.id,
    name: p.name,
    avatarId: p.avatarId,
    isHost: p.id === room.hostId,
    solved: p.status === 'solved',
    numGuesses: p.numGuesses,
    timeTakenSeconds: p.finishTimeMs ? (p.finishTimeMs / 1000).toFixed(1) : null,
    guesses: p.guesses // Contains colors of all rows for mini grid preview
  }));
}

function sanitizeRoomForClient(room, playerId) {
  const players = Array.from(room.players.values()).map(p => ({
    id: p.id,
    name: p.name,
    avatarId: p.avatarId,
    isHost: p.id === room.hostId,
    status: p.status,
    numGuesses: p.numGuesses,
    finishTimeMs: p.finishTimeMs,
    // Provide opponent color grids (no letters!)
    miniGrid: p.guesses.map(g => g.colors)
  }));

  return {
    code: room.code,
    hostId: room.hostId,
    isHost: room.hostId === playerId,
    gameState: room.gameState,
    roundNumber: room.roundNumber,
    roundStartTime: room.roundStartTime,
    players,
    maxPlayers: room.maxPlayers
  };
}

io.on('connection', (socket) => {
  let currentRoomCode = null;

  socket.on('create_room', ({ playerName, avatarId }) => {
    const code = generateRoomCode();
    currentRoomCode = code;

    const player = {
      id: socket.id,
      name: (playerName || 'Player 1').trim().slice(0, 15),
      avatarId: Number(avatarId) || 0,
      status: 'lobby',
      guesses: [],
      numGuesses: 0,
      finishTimeMs: null
    };

    const room = {
      code,
      hostId: socket.id,
      maxPlayers: 8,
      players: new Map([[socket.id, player]]),
      gameState: 'lobby',
      roundNumber: 1,
      targetWord: '',
      usedWords: new Set(),
      roundStartTime: null
    };

    rooms.set(code, room);
    socket.join(code);

    socket.emit('room_joined', sanitizeRoomForClient(room, socket.id));
    console.log(`Room created: ${code} by ${player.name} (${socket.id})`);
  });

  socket.on('join_room', ({ roomCode, playerName, avatarId }) => {
    const code = (roomCode || '').trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      return socket.emit('join_error', { message: `Room "${code}" not found.` });
    }

    if (room.players.size >= room.maxPlayers) {
      return socket.emit('join_error', { message: 'Room is full (max 8 players).' });
    }

    currentRoomCode = code;
    const player = {
      id: socket.id,
      name: (playerName || `Player ${room.players.size + 1}`).trim().slice(0, 15),
      avatarId: Number(avatarId) || (room.players.size % 8),
      status: room.gameState === 'playing' ? 'spectating' : 'lobby',
      guesses: [],
      numGuesses: 0,
      finishTimeMs: null
    };

    room.players.set(socket.id, player);
    socket.join(code);

    socket.emit('room_joined', sanitizeRoomForClient(room, socket.id));
    io.to(code).emit('room_updated', sanitizeRoomForClient(room, null));
    console.log(`${player.name} joined room ${code}`);
  });

  function startGame(room) {
    // Pick a new random target word not yet used
    let availableWords = targetWords.filter(w => !room.usedWords.has(w));
    if (availableWords.length === 0) {
      room.usedWords.clear();
      availableWords = targetWords;
    }
    const chosenWord = availableWords[Math.floor(Math.random() * availableWords.length)].toLowerCase();
    room.targetWord = chosenWord;
    room.usedWords.add(chosenWord);

    console.log(`[Room ${room.code}] Round ${room.roundNumber} secret word: "${chosenWord}"`);

    // Reset active players
    for (const p of room.players.values()) {
      p.status = 'playing';
      p.guesses = [];
      p.numGuesses = 0;
      p.finishTimeMs = null;
    }

    room.gameState = 'playing';
    room.roundStartTime = Date.now();

    // Broadcast round start (secret word is NEVER sent to clients)
    io.to(room.code).emit('game_started', {
      roundNumber: room.roundNumber,
      roundStartTime: room.roundStartTime,
      room: sanitizeRoomForClient(room, null)
    });
  }

  socket.on('start_game', ({ roomCode }) => {
    const code = roomCode || currentRoomCode;
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    startGame(room);
  });

  socket.on('submit_guess', ({ roomCode, guess }) => {
    const code = roomCode || currentRoomCode;
    const room = rooms.get(code);
    if (!room || room.gameState !== 'playing') return;

    const player = room.players.get(socket.id);
    if (!player || player.status !== 'playing') return;

    if (!guess || typeof guess !== 'string' || guess.length !== 5) {
      return socket.emit('guess_error', { message: 'Must be 5 letters.' });
    }

    const cleanGuess = guess.toLowerCase();
    if (!allowedGuessesSet.has(cleanGuess)) {
      return socket.emit('guess_error', { message: 'Not in word list.' });
    }

    // Evaluate colors
    const colors = evaluateGuess(cleanGuess, room.targetWord);
    player.guesses.push({ word: cleanGuess, colors });
    player.numGuesses = player.guesses.length;

    const solved = colors.every(c => c === 'correct');
    const failed = !solved && player.numGuesses >= 6;

    if (solved) {
      player.status = 'solved';
      player.finishTimeMs = Date.now() - room.roundStartTime;
    } else if (failed) {
      player.status = 'failed';
      player.finishTimeMs = Date.now() - room.roundStartTime;
    }

    // Send back evaluation to guesser
    socket.emit('guess_result', {
      guess: cleanGuess,
      colors,
      rowIndex: player.numGuesses - 1,
      solved,
      failed,
      finishTimeMs: player.finishTimeMs
    });

    // Notify all opponents in the room of progress (ONLY colors, NEVER the letters!)
    socket.to(code).emit('opponent_progress', {
      playerId: socket.id,
      rowIndex: player.numGuesses - 1,
      colors,
      status: player.status,
      finishTimeMs: player.finishTimeMs,
      numGuesses: player.numGuesses
    });

    // Check if round is over (all active playing players are done)
    const activePlayers = Array.from(room.players.values()).filter(p => p.status !== 'spectating');
    const allFinished = activePlayers.length > 0 && activePlayers.every(p => p.status === 'solved' || p.status === 'failed');

    if (allFinished) {
      room.gameState = 'round_end';
      const leaderboard = computeLeaderboard(room);
      io.to(code).emit('game_over', {
        targetWord: room.targetWord.toUpperCase(),
        leaderboard,
        roundNumber: room.roundNumber
      });
    }
  });

  socket.on('next_round', ({ roomCode }) => {
    const code = roomCode || currentRoomCode;
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;

    room.roundNumber += 1;
    startGame(room);
  });

  socket.on('disconnect', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    room.players.delete(socket.id);
    console.log(`Player ${socket.id} disconnected from ${currentRoomCode}`);

    if (room.players.size === 0) {
      rooms.delete(currentRoomCode);
      console.log(`Room ${currentRoomCode} deleted (empty)`);
      return;
    }

    // Reassign host if host left
    if (room.hostId === socket.id) {
      const nextHostId = room.players.keys().next().value;
      room.hostId = nextHostId;
    }

    io.to(currentRoomCode).emit('player_left', {
      playerId: socket.id,
      room: sanitizeRoomForClient(room, null)
    });

    // If game in progress, recheck if remaining players are done
    if (room.gameState === 'playing') {
      const activePlayers = Array.from(room.players.values()).filter(p => p.status !== 'spectating');
      const allFinished = activePlayers.length > 0 && activePlayers.every(p => p.status === 'solved' || p.status === 'failed');
      if (allFinished) {
        room.gameState = 'round_end';
        const leaderboard = computeLeaderboard(room);
        io.to(currentRoomCode).emit('game_over', {
          targetWord: room.targetWord.toUpperCase(),
          leaderboard,
          roundNumber: room.roundNumber
        });
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`🎮 Wordle Online Battle Server running on:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`===============================================`);
});
