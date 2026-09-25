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
targetWords.forEach(w => allowedGuessesSet.add(w.toLowerCase()));

console.log(`Loaded ${targetWords.length} target words and ${allowedGuessesSet.size} allowed guesses.`);

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

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function evaluateGuess(guess, target) {
  guess = guess.toLowerCase();
  target = target.toLowerCase();
  const result = new Array(5).fill('absent');
  const targetCounts = {};

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

  if (room.gameMode === 'mode2') {
    // Mode 2 Criteria (in order):
    // 1. Most wordles solved (descending)
    // 2. Fewer number of total guesses (ascending)
    // 3. Fewer number of unguessed words (ascending)
    // 4. Tie breaker: Time of last solve
    const ranked = [...players].sort((a, b) => {
      if (b.wordsSolved !== a.wordsSolved) {
        return b.wordsSolved - a.wordsSolved;
      }
      if (a.totalGuesses !== b.totalGuesses) {
        return a.totalGuesses - b.totalGuesses;
      }
      if (a.wordsFailed !== b.wordsFailed) {
        return a.wordsFailed - b.wordsFailed;
      }
      return (a.lastSolveTimeMs || 9999999) - (b.lastSolveTimeMs || 9999999);
    });

    return ranked.map((p, idx) => ({
      rank: idx + 1,
      id: p.id,
      name: p.name,
      avatarId: p.avatarId,
      isHost: p.id === room.hostId,
      wordsSolved: p.wordsSolved,
      wordsFailed: p.wordsFailed,
      totalGuesses: p.totalGuesses,
      currentWordIndex: p.currentWordIndex,
      lastSolveTimeSeconds: p.lastSolveTimeMs ? (p.lastSolveTimeMs / 1000).toFixed(1) : null
    }));
  }

  if (room.gameMode === 'mode3') {
    // Mode 3 Criteria:
    // 1. Most questions solved (descending)
    // 2. Fewer total guesses (ascending)
    // 3. Total completion time (ascending)
    const ranked = [...players].sort((a, b) => {
      if (b.wordsSolved !== a.wordsSolved) {
        return b.wordsSolved - a.wordsSolved;
      }
      if (a.totalGuesses !== b.totalGuesses) {
        return a.totalGuesses - b.totalGuesses;
      }
      const aTime = a.finishTimeMs || a.lastSolveTimeMs || 9999999;
      const bTime = b.finishTimeMs || b.lastSolveTimeMs || 9999999;
      return aTime - bTime;
    });

    return ranked.map((p, idx) => ({
      rank: idx + 1,
      id: p.id,
      name: p.name,
      avatarId: p.avatarId,
      isHost: p.id === room.hostId,
      wordsSolved: p.wordsSolved,
      totalQuestions: room.numQuestions,
      totalGuesses: p.totalGuesses,
      finished: p.status === 'finished',
      timeTakenSeconds: p.finishTimeMs ? (p.finishTimeMs / 1000).toFixed(1) : null
    }));
  }

  // Mode 1: Classic
  // 1. Solved > Failed
  // 2. Least moves taken
  // 3. Time taken
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
    guesses: p.guesses
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
    currentWordIndex: p.currentWordIndex,
    wordsSolved: p.wordsSolved,
    wordsFailed: p.wordsFailed,
    totalGuesses: p.totalGuesses,
    finishTimeMs: p.finishTimeMs,
    miniGrid: p.guesses ? p.guesses.map(g => g.colors) : []
  }));

  return {
    code: room.code,
    hostId: room.hostId,
    isHost: room.hostId === playerId,
    gameState: room.gameState,
    gameMode: room.gameMode,
    timeLimitMinutes: room.timeLimitMinutes,
    timeLimitSeconds: room.timeLimitSeconds,
    numQuestions: room.numQuestions,
    maxGuessesPerWord: room.maxGuessesPerWord,
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
      currentWordIndex: 0,
      guesses: [],
      numGuesses: 0,
      wordsSolved: 0,
      wordsFailed: 0,
      totalGuesses: 0,
      finishTimeMs: null,
      lastSolveTimeMs: null,
      history: []
    };

    const room = {
      code,
      hostId: socket.id,
      maxPlayers: 8,
      players: new Map([[socket.id, player]]),
      gameState: 'lobby',
      gameMode: 'mode1', // 'mode1' | 'mode2' | 'mode3'
      timeLimitMinutes: 5,
      timeLimitSeconds: 0,
      numQuestions: 5,
      maxGuessesPerWord: 6,
      roundNumber: 1,
      wordSequence: [],
      roundStartTime: null,
      timer: null
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
      currentWordIndex: 0,
      guesses: [],
      numGuesses: 0,
      wordsSolved: 0,
      wordsFailed: 0,
      totalGuesses: 0,
      finishTimeMs: null,
      lastSolveTimeMs: null,
      history: []
    };

    room.players.set(socket.id, player);
    socket.join(code);

    socket.emit('room_joined', sanitizeRoomForClient(room, socket.id));
    io.to(code).emit('room_updated', sanitizeRoomForClient(room, null));
    console.log(`${player.name} joined room ${code}`);
  });

  socket.on('update_room_settings', ({ roomCode, gameMode, timeLimitMinutes, numQuestions }) => {
    const code = roomCode || currentRoomCode;
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id || room.gameState === 'playing') return;

    if (gameMode && ['mode1', 'mode2', 'mode3'].includes(gameMode)) {
      room.gameMode = gameMode;
    }

    if (timeLimitMinutes) {
      const mins = Math.max(2, Math.min(15, parseInt(timeLimitMinutes, 10) || 5));
      room.timeLimitMinutes = mins;
    }

    if (numQuestions) {
      const q = Math.max(1, Math.min(25, parseInt(numQuestions, 10) || 5));
      room.numQuestions = q;
    }

    // Update max guesses based on mode
    if (room.gameMode === 'mode1') {
      room.maxGuessesPerWord = 6;
      room.timeLimitSeconds = 0;
    } else if (room.gameMode === 'mode2') {
      room.maxGuessesPerWord = 8; // Mode 2: 8 guesses per word
      room.timeLimitSeconds = room.timeLimitMinutes * 60;
    } else if (room.gameMode === 'mode3') {
      room.maxGuessesPerWord = 5; // Mode 3: 5 guesses only per word
      room.timeLimitSeconds = room.timeLimitMinutes * 60;
    }

    io.to(code).emit('room_updated', sanitizeRoomForClient(room, null));
  });

  function endGame(room) {
    if (room.timer) {
      clearTimeout(room.timer);
      room.timer = null;
    }
    room.gameState = 'round_end';
    const leaderboard = computeLeaderboard(room);

    let targetWord = '';
    if (room.gameMode === 'mode1' && room.wordSequence.length > 0) {
      targetWord = room.wordSequence[0].toUpperCase();
    }

    io.to(room.code).emit('game_over', {
      gameMode: room.gameMode,
      targetWord,
      leaderboard,
      roundNumber: room.roundNumber
    });
  }

  function startGame(room) {
    if (room.timer) {
      clearTimeout(room.timer);
      room.timer = null;
    }

    // Configure max guesses per word
    if (room.gameMode === 'mode1') {
      room.maxGuessesPerWord = 6;
      room.timeLimitSeconds = 0;
    } else if (room.gameMode === 'mode2') {
      room.maxGuessesPerWord = 8;
      room.timeLimitSeconds = room.timeLimitMinutes * 60;
    } else if (room.gameMode === 'mode3') {
      room.maxGuessesPerWord = 5;
      room.timeLimitSeconds = room.timeLimitMinutes * 60;
    }

    // Generate word sequence from targetWords
    const shuffled = shuffleArray(targetWords);
    if (room.gameMode === 'mode1') {
      room.wordSequence = [shuffled[0].toLowerCase()];
    } else if (room.gameMode === 'mode3') {
      room.wordSequence = shuffled.slice(0, room.numQuestions).map(w => w.toLowerCase());
    } else {
      // Mode 2: 120 words for continuous play
      room.wordSequence = shuffled.slice(0, 120).map(w => w.toLowerCase());
    }

    console.log(`[Room ${room.code}] Started Game (${room.gameMode}). Words prepared: ${room.wordSequence.length}`);

    // Reset all players
    for (const p of room.players.values()) {
      p.status = 'playing';
      p.currentWordIndex = 0;
      p.guesses = [];
      p.numGuesses = 0;
      p.wordsSolved = 0;
      p.wordsFailed = 0;
      p.totalGuesses = 0;
      p.finishTimeMs = null;
      p.lastSolveTimeMs = null;
      p.history = [];
    }

    room.gameState = 'playing';
    room.roundStartTime = Date.now();

    // Set countdown timer for Mode 2 and Mode 3
    if (room.timeLimitSeconds > 0) {
      room.timer = setTimeout(() => {
        if (room.gameState === 'playing') {
          console.log(`[Room ${room.code}] Timer expired (${room.timeLimitMinutes}m). Ending game.`);
          endGame(room);
        }
      }, room.timeLimitSeconds * 1000 + 500);
    }

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

    const targetWord = room.wordSequence[player.currentWordIndex];
    if (!targetWord) return;

    // Evaluate colors
    const colors = evaluateGuess(cleanGuess, targetWord);
    player.guesses.push({ word: cleanGuess, colors });
    player.numGuesses = player.guesses.length;
    player.totalGuesses++;

    const wordSolved = colors.every(c => c === 'correct');
    const wordFailed = !wordSolved && player.numGuesses >= room.maxGuessesPerWord;
    const wordFinished = wordSolved || wordFailed;

    let advanceNextWord = false;

    if (wordFinished) {
      if (wordSolved) {
        player.wordsSolved++;
        player.lastSolveTimeMs = Date.now() - room.roundStartTime;
      } else {
        player.wordsFailed++;
      }

      player.history.push({
        wordIndex: player.currentWordIndex,
        word: targetWord,
        solved: wordSolved,
        numGuesses: player.numGuesses
      });

      if (room.gameMode === 'mode1') {
        player.status = wordSolved ? 'solved' : 'failed';
        player.finishTimeMs = Date.now() - room.roundStartTime;
      } else if (room.gameMode === 'mode3') {
        if (player.currentWordIndex + 1 >= room.numQuestions) {
          player.status = 'finished';
          player.finishTimeMs = Date.now() - room.roundStartTime;
        } else {
          advanceNextWord = true;
        }
      } else if (room.gameMode === 'mode2') {
        advanceNextWord = true;
      }
    }

    // Send back evaluation to guesser
    socket.emit('guess_result', {
      guess: cleanGuess,
      colors,
      rowIndex: player.numGuesses - 1,
      wordSolved,
      wordFailed,
      wordFinished,
      targetWordRevealed: wordFinished ? targetWord.toUpperCase() : null,
      currentWordIndex: player.currentWordIndex,
      wordsSolved: player.wordsSolved,
      wordsFailed: player.wordsFailed,
      totalGuesses: player.totalGuesses,
      playerStatus: player.status,
      advanceNextWord,
      finishTimeMs: player.finishTimeMs
    });

    // Notify all opponents in the room of progress (ONLY colors, NEVER the letters!)
    socket.to(code).emit('opponent_progress', {
      playerId: socket.id,
      rowIndex: player.numGuesses - 1,
      colors,
      currentWordIndex: player.currentWordIndex,
      wordsSolved: player.wordsSolved,
      wordsFailed: player.wordsFailed,
      totalGuesses: player.totalGuesses,
      wordSolved,
      wordFailed,
      wordFinished,
      status: player.status
    });

    // Prepare next word if advancing
    if (advanceNextWord) {
      player.currentWordIndex++;
      player.guesses = [];
      player.numGuesses = 0;
    }

    // Live Leaderboard update for Mode 2 & Mode 3 whenever a word is finished
    if (wordFinished && (room.gameMode === 'mode2' || room.gameMode === 'mode3')) {
      io.to(code).emit('live_leaderboard_update', {
        leaderboard: computeLeaderboard(room),
        gameMode: room.gameMode
      });
    }

    // Check if entire match is finished
    const activePlayers = Array.from(room.players.values()).filter(p => p.status !== 'spectating');
    let allFinished = false;

    if (room.gameMode === 'mode1') {
      allFinished = activePlayers.length > 0 && activePlayers.every(p => p.status === 'solved' || p.status === 'failed');
    } else if (room.gameMode === 'mode3') {
      allFinished = activePlayers.length > 0 && activePlayers.every(p => p.status === 'finished');
    }

    if (allFinished) {
      endGame(room);
    }
  });

  socket.on('next_round', ({ roomCode }) => {
    const code = roomCode || currentRoomCode;
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;

    room.roundNumber += 1;
    startGame(room);
  });

  socket.on('return_to_lobby', ({ roomCode }) => {
    const code = roomCode || currentRoomCode;
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;

    if (room.timer) {
      clearTimeout(room.timer);
      room.timer = null;
    }
    room.gameState = 'lobby';
    for (const p of room.players.values()) {
      p.status = 'lobby';
      p.guesses = [];
      p.numGuesses = 0;
      p.wordsSolved = 0;
      p.wordsFailed = 0;
      p.totalGuesses = 0;
      p.finishTimeMs = null;
      p.lastSolveTimeMs = null;
      p.history = [];
    }

    io.to(code).emit('room_returned_to_lobby', sanitizeRoomForClient(room, null));
  });

  socket.on('disconnect', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    room.players.delete(socket.id);
    console.log(`Player ${socket.id} disconnected from ${currentRoomCode}`);

    if (room.players.size === 0) {
      if (room.timer) clearTimeout(room.timer);
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

    if (room.gameState === 'playing') {
      const activePlayers = Array.from(room.players.values()).filter(p => p.status !== 'spectating');
      let allFinished = false;

      if (room.gameMode === 'mode1') {
        allFinished = activePlayers.length > 0 && activePlayers.every(p => p.status === 'solved' || p.status === 'failed');
      } else if (room.gameMode === 'mode3') {
        allFinished = activePlayers.length > 0 && activePlayers.every(p => p.status === 'finished');
      }

      if (allFinished) {
        endGame(room);
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
