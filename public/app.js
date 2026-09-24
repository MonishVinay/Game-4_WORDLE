// Wordle Battle Client Application
document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  // App State
  let currentView = 'landing';
  let myPlayerId = null;
  let currentRoomCode = null;
  let isHost = false;
  let selectedAvatarId = 0;
  let currentRound = 1;
  let roundStartTime = null;
  let timerInterval = null;

  // Board State
  const WORD_LENGTH = 5;
  const MAX_GUESSES = 6;
  let currentRow = 0;
  let currentGuess = '';
  let isInputLocked = false;
  let myGameStatus = 'playing'; // 'playing' | 'solved' | 'failed'
  let keyStates = {}; // letter -> 'correct' | 'present' | 'absent'
  let playerGuessesHistory = []; // stores colors for sharing results

  // DOM Elements - Views
  const viewLanding = document.getElementById('view-landing');
  const viewWaiting = document.getElementById('view-waiting');
  const viewGame = document.getElementById('view-game');
  const modalResults = document.getElementById('modal-results');
  const toastEl = document.getElementById('toast');

  // DOM Elements - Landing
  const playerNameInput = document.getElementById('player-name-input');
  const avatarPicker = document.getElementById('avatar-picker');
  const tabCreate = document.getElementById('tab-create');
  const tabJoin = document.getElementById('tab-join');
  const panelCreate = document.getElementById('panel-create');
  const panelJoin = document.getElementById('panel-join');
  const btnCreateRoom = document.getElementById('btn-create-room');
  const btnJoinRoom = document.getElementById('btn-join-room');
  const joinCodeInput = document.getElementById('join-code-input');

  // DOM Elements - Waiting Room
  const waitingRoomCode = document.getElementById('waiting-room-code');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const playerCountBadge = document.getElementById('player-count-badge');
  const lobbyPlayerList = document.getElementById('lobby-player-list');
  const btnStartGame = document.getElementById('btn-start-game');
  const waitingHostNotice = document.getElementById('waiting-host-notice');
  const btnLeaveWaiting = document.getElementById('btn-leave-waiting');

  // DOM Elements - Game
  const gameRoomCode = document.getElementById('game-room-code');
  const btnCopyGameRoom = document.getElementById('btn-copy-game-room');
  const gameTimer = document.getElementById('game-timer');
  const gameRoundBadge = document.getElementById('game-round-badge');
  const btnLeaveGame = document.getElementById('btn-leave-game');
  const btnInviteSidebar = document.getElementById('btn-invite-sidebar');
  const opponentsList = document.getElementById('opponents-list');
  const wordleBoard = document.getElementById('wordle-board');
  const virtualKeyboard = document.getElementById('virtual-keyboard');
  const boardAlert = document.getElementById('board-alert');

  // DOM Elements - Modal Results
  const revealWord = document.getElementById('reveal-word');
  const podiumSection = document.getElementById('podium-section');
  const leaderboardList = document.getElementById('leaderboard-list');
  const btnNextRound = document.getElementById('btn-next-round');
  const modalGuestNotice = document.getElementById('modal-guest-notice');
  const btnShareResults = document.getElementById('btn-share-results');
  const btnModalLobby = document.getElementById('btn-modal-lobby');
  const confettiCanvas = document.getElementById('confetti-canvas');

  // -------------------------------------------------------------
  // INITIALIZATION & AVATAR PICKER
  // -------------------------------------------------------------
  function initAvatars() {
    avatarPicker.innerHTML = '';
    AVATARS.forEach((av) => {
      const opt = document.createElement('div');
      opt.className = `avatar-option ${av.id === selectedAvatarId ? 'selected' : ''}`;
      opt.innerHTML = av.svg;
      opt.title = av.name;
      opt.addEventListener('click', () => {
        selectedAvatarId = av.id;
        document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
        opt.classList.add('selected');
      });
      avatarPicker.appendChild(opt);
    });
  }

  // Pre-fill name or room code from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    joinCodeInput.value = roomParam.trim().toUpperCase();
    tabJoin.click();
  }

  // Random placeholder name
  const sampleNames = ['PixelRacer', 'WordNinja', 'StarGazer', 'Cipher', 'Vortex', 'EchoMaster', 'AlphaWord', 'Luna'];
  const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
  playerNameInput.placeholder = randomName;
  selectedAvatarId = Math.floor(Math.random() * AVATARS.length);
  initAvatars();

  // Tab switching
  tabCreate.addEventListener('click', () => {
    tabCreate.classList.add('active');
    tabJoin.classList.remove('active');
    panelCreate.classList.add('active');
    panelJoin.classList.remove('active');
  });

  tabJoin.addEventListener('click', () => {
    tabJoin.classList.add('active');
    tabCreate.classList.remove('active');
    panelJoin.classList.add('active');
    panelCreate.classList.remove('active');
  });

  // Switch View Helper
  function switchView(viewName) {
    currentView = viewName;
    viewLanding.classList.toggle('active', viewName === 'landing');
    viewWaiting.classList.toggle('active', viewName === 'waiting');
    viewGame.classList.toggle('active', viewName === 'game');
    if (viewName !== 'game') {
      modalResults.classList.add('hidden');
      stopTimer();
    }
  }

  // Toast Helper
  let toastTimeout = null;
  function showToast(message, duration = 2000) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    toastTimeout = setTimeout(() => {
      toastEl.classList.add('hidden');
    }, duration);
  }

  // Copy Room Link Helper
  function copyRoomLink(code) {
    const url = `${window.location.origin}${window.location.pathname}?room=${code || currentRoomCode}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('📋 Room link copied to clipboard!');
      }).catch(() => {
        showToast(`Room Code: ${code || currentRoomCode}`);
      });
    } else {
      showToast(`Room Code: ${code || currentRoomCode}`);
    }
  }

  btnCopyCode.addEventListener('click', () => copyRoomLink(currentRoomCode));
  btnCopyGameRoom.addEventListener('click', () => copyRoomLink(currentRoomCode));
  btnInviteSidebar.addEventListener('click', () => copyRoomLink(currentRoomCode));

  // -------------------------------------------------------------
  // LOBBY & ROOM CREATION / JOIN
  // -------------------------------------------------------------
  btnCreateRoom.addEventListener('click', () => {
    const name = playerNameInput.value.trim() || playerNameInput.placeholder;
    socket.emit('create_room', {
      playerName: name,
      avatarId: selectedAvatarId
    });
  });

  btnJoinRoom.addEventListener('click', () => {
    const code = joinCodeInput.value.trim().toUpperCase();
    if (!code) {
      showToast('Please enter a room code');
      return;
    }
    const name = playerNameInput.value.trim() || playerNameInput.placeholder;
    socket.emit('join_room', {
      roomCode: code,
      playerName: name,
      avatarId: selectedAvatarId
    });
  });

  btnLeaveWaiting.addEventListener('click', () => {
    window.location.href = window.location.pathname;
  });

  btnLeaveGame.addEventListener('click', () => {
    if (confirm('Are you sure you want to leave the game?')) {
      window.location.href = window.location.pathname;
    }
  });

  btnModalLobby.addEventListener('click', () => {
    modalResults.classList.add('hidden');
    switchView('waiting');
  });

  btnStartGame.addEventListener('click', () => {
    socket.emit('start_game', { roomCode: currentRoomCode });
  });

  btnNextRound.addEventListener('click', () => {
    socket.emit('next_round', { roomCode: currentRoomCode });
  });

  // -------------------------------------------------------------
  // SOCKET EVENTS
  // -------------------------------------------------------------
  socket.on('connect', () => {
    myPlayerId = socket.id;
  });

  socket.on('join_error', ({ message }) => {
    showToast(`⚠️ ${message}`, 3000);
  });

  socket.on('room_joined', (room) => {
    handleRoomUpdate(room);
    if (room.gameState === 'playing') {
      setupGameBoard();
      switchView('game');
    } else {
      switchView('waiting');
    }
  });

  socket.on('room_updated', (room) => {
    handleRoomUpdate(room);
  });

  socket.on('player_left', ({ playerId, room }) => {
    showToast('A player left the room');
    handleRoomUpdate(room);
  });

  socket.on('game_started', ({ roundNumber, roundStartTime: startTime, room }) => {
    currentRound = roundNumber;
    roundStartTime = startTime;
    modalResults.classList.add('hidden');
    handleRoomUpdate(room);
    setupGameBoard();
    switchView('game');
    startTimer();
    showToast(`Round ${roundNumber} Started! Guess the word!`, 2500);
  });

  socket.on('guess_error', ({ message }) => {
    isInputLocked = false;
    showBoardAlert(message);
    shakeCurrentRow();
  });

  socket.on('guess_result', ({ guess, colors, rowIndex, solved, failed, finishTimeMs }) => {
    playerGuessesHistory.push(colors);
    revealRowResult(rowIndex, guess, colors, () => {
      isInputLocked = false;
      if (solved) {
        myGameStatus = 'solved';
        isInputLocked = true;
        bounceRow(rowIndex);
        const timeSec = (finishTimeMs / 1000).toFixed(1);
        showToast(`🎉 SOLVED in ${rowIndex + 1} guesses! (${timeSec}s)`, 3500);
      } else if (failed) {
        myGameStatus = 'failed';
        isInputLocked = true;
        showToast(`Out of guesses! Waiting for other players...`, 3000);
      } else {
        currentRow++;
        currentGuess = '';
      }
    });
  });

  socket.on('opponent_progress', ({ playerId, rowIndex, colors, status, finishTimeMs, numGuesses }) => {
    updateOpponentCard(playerId, rowIndex, colors, status, finishTimeMs, numGuesses);
  });

  socket.on('game_over', ({ targetWord, leaderboard, roundNumber }) => {
    stopTimer();
    setTimeout(() => {
      showGameOverModal(targetWord, leaderboard, roundNumber);
    }, 1200);
  });

  // -------------------------------------------------------------
  // ROOM STATE RENDERING
  // -------------------------------------------------------------
  function handleRoomUpdate(room) {
    currentRoomCode = room.code;
    isHost = room.hostId === socket.id;

    // Update Waiting View
    waitingRoomCode.textContent = room.code;
    gameRoomCode.textContent = `ROOM: ${room.code}`;
    playerCountBadge.textContent = `${room.players.length} / ${room.maxPlayers}`;
    gameRoundBadge.textContent = `Round ${room.roundNumber || 1}`;

    // Host controls
    if (isHost) {
      btnStartGame.classList.remove('hidden');
      waitingHostNotice.classList.add('hidden');
      btnNextRound.classList.remove('hidden');
      modalGuestNotice.classList.add('hidden');
    } else {
      btnStartGame.classList.add('hidden');
      waitingHostNotice.classList.remove('hidden');
      btnNextRound.classList.add('hidden');
      modalGuestNotice.classList.remove('hidden');
    }

    // Render lobby players
    lobbyPlayerList.innerHTML = '';
    room.players.forEach((p) => {
      const card = document.createElement('div');
      card.className = `lobby-player-card ${p.id === socket.id ? 'is-you' : ''}`;
      card.innerHTML = `
        <div class="lobby-player-avatar">${getAvatarSvg(p.avatarId)}</div>
        <div class="lobby-player-info">
          <div class="lobby-player-name">${escapeHtml(p.name)} ${p.id === socket.id ? '(You)' : ''}</div>
          ${p.isHost ? '<span class="lobby-host-tag">👑 Host</span>' : ''}
        </div>
      `;
      lobbyPlayerList.appendChild(card);
    });

    // Render game opponents in sidebar
    renderOpponentsSidebar(room.players);
  }

  function renderOpponentsSidebar(players) {
    opponentsList.innerHTML = '';
    const otherPlayers = players.filter(p => p.id !== socket.id);

    otherPlayers.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'opponent-card';
      card.id = `opponent-card-${p.id}`;

      let statusText = 'Thinking...';
      if (p.status === 'solved') {
        const timeSec = p.finishTimeMs ? `${(p.finishTimeMs / 1000).toFixed(1)}s` : '';
        statusText = `🎉 Solved (${p.numGuesses}/6, ${timeSec})`;
      } else if (p.status === 'failed') {
        statusText = 'Failed (6/6)';
      } else if (p.numGuesses > 0) {
        statusText = `Guess ${p.numGuesses}/6`;
      }

      // Build 5x6 mini grid HTML
      let miniGridHtml = '<div class="mini-grid">';
      for (let r = 0; r < 6; r++) {
        const rowColors = (p.miniGrid && p.miniGrid[r]) ? p.miniGrid[r] : null;
        for (let c = 0; c < 5; c++) {
          const colorClass = rowColors ? rowColors[c] : '';
          miniGridHtml += `<div class="mini-cell ${colorClass}" data-r="${r}" data-c="${c}"></div>`;
        }
      }
      miniGridHtml += '</div>';

      card.innerHTML = `
        <div class="opponent-card-header">
          <div class="opponent-avatar">${getAvatarSvg(p.avatarId)}</div>
          <div class="opponent-meta">
            <div class="opponent-name">${escapeHtml(p.name)}</div>
            <div class="opponent-status ${p.status === 'solved' ? 'solved' : ''}">${statusText}</div>
          </div>
        </div>
        <div class="opponent-card-body">
          ${miniGridHtml}
        </div>
      `;

      opponentsList.appendChild(card);
    });
  }

  function updateOpponentCard(playerId, rowIndex, colors, status, finishTimeMs, numGuesses) {
    const card = document.getElementById(`opponent-card-${playerId}`);
    if (!card) return;

    // Update mini-grid cells for rowIndex
    colors.forEach((color, colIndex) => {
      const cell = card.querySelector(`.mini-cell[data-r="${rowIndex}"][data-c="${colIndex}"]`);
      if (cell) {
        cell.className = `mini-cell ${color}`;
      }
    });

    // Update status text
    const statusEl = card.querySelector('.opponent-status');
    if (statusEl) {
      if (status === 'solved') {
        const timeSec = finishTimeMs ? `${(finishTimeMs / 1000).toFixed(1)}s` : '';
        statusEl.textContent = `🎉 Solved (${numGuesses}/6, ${timeSec})`;
        statusEl.classList.add('solved');
      } else if (status === 'failed') {
        statusEl.textContent = 'Failed (6/6)';
        statusEl.classList.remove('solved');
      } else {
        statusEl.textContent = `Guess ${numGuesses}/6`;
      }
    }
  }

  // -------------------------------------------------------------
  // GAME BOARD & KEYBOARD
  // -------------------------------------------------------------
  function setupGameBoard() {
    currentRow = 0;
    currentGuess = '';
    isInputLocked = false;
    myGameStatus = 'playing';
    keyStates = {};
    playerGuessesHistory = [];
    boardAlert.classList.add('hidden');

    // Build 5x6 Board
    wordleBoard.innerHTML = '';
    for (let r = 0; r < MAX_GUESSES; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'board-row';
      rowEl.dataset.row = r;
      for (let c = 0; c < WORD_LENGTH; c++) {
        const tileEl = document.createElement('div');
        tileEl.className = 'board-tile';
        tileEl.dataset.row = r;
        tileEl.dataset.col = c;
        rowEl.appendChild(tileEl);
      }
      wordleBoard.appendChild(rowEl);
    }

    // Reset virtual keyboard keys
    document.querySelectorAll('.key').forEach((keyEl) => {
      keyEl.classList.remove('correct', 'present', 'absent');
    });
  }

  function handleKeyPress(key) {
    if (currentView !== 'game' || isInputLocked || myGameStatus !== 'playing') return;

    const upperKey = key.toUpperCase();

    if (upperKey === 'ENTER') {
      submitGuess();
    } else if (upperKey === 'BACKSPACE' || upperKey === '⌫') {
      deleteLetter();
    } else if (/^[A-Z]$/.test(upperKey)) {
      addLetter(upperKey);
    }
  }

  function addLetter(letter) {
    if (currentGuess.length >= WORD_LENGTH) return;
    currentGuess += letter;
    const tile = getTile(currentRow, currentGuess.length - 1);
    if (tile) {
      tile.textContent = letter;
      tile.classList.add('pop');
      setTimeout(() => tile.classList.remove('pop'), 120);
    }
  }

  function deleteLetter() {
    if (currentGuess.length === 0) return;
    const tile = getTile(currentRow, currentGuess.length - 1);
    if (tile) {
      tile.textContent = '';
      tile.classList.remove('pop');
    }
    currentGuess = currentGuess.slice(0, -1);
  }

  function submitGuess() {
    if (currentGuess.length < WORD_LENGTH) {
      showBoardAlert('Not enough letters');
      shakeCurrentRow();
      return;
    }

    isInputLocked = true;
    socket.emit('submit_guess', {
      roomCode: currentRoomCode,
      guess: currentGuess
    });
  }

  function getTile(row, col) {
    return wordleBoard.querySelector(`.board-tile[data-row="${row}"][data-col="${col}"]`);
  }

  function shakeCurrentRow() {
    const rowEl = wordleBoard.querySelector(`.board-row[data-row="${currentRow}"]`);
    if (rowEl) {
      rowEl.classList.add('shake');
      setTimeout(() => rowEl.classList.remove('shake'), 450);
    }
  }

  function bounceRow(row) {
    for (let c = 0; c < WORD_LENGTH; c++) {
      const tile = getTile(row, c);
      if (tile) {
        setTimeout(() => {
          tile.classList.add('bounce');
        }, c * 100);
      }
    }
  }

  function showBoardAlert(msg) {
    boardAlert.textContent = msg;
    boardAlert.classList.remove('hidden');
    setTimeout(() => {
      boardAlert.classList.add('hidden');
    }, 1800);
  }

  function revealRowResult(rowIndex, guess, colors, callback) {
    const delayStep = 250;

    colors.forEach((color, colIndex) => {
      setTimeout(() => {
        const tile = getTile(rowIndex, colIndex);
        if (tile) {
          tile.classList.add('flip');
          setTimeout(() => {
            tile.classList.add(color);
            // Update keyboard key
            updateKeyColor(guess[colIndex].toUpperCase(), color);
          }, 220);
        }

        if (colIndex === colors.length - 1) {
          setTimeout(callback, 350);
        }
      }, colIndex * delayStep);
    });
  }

  function updateKeyColor(letter, state) {
    const current = keyStates[letter];
    // Priority: correct > present > absent
    if (current === 'correct') return;
    if (current === 'present' && state === 'absent') return;

    keyStates[letter] = state;

    const keyBtn = virtualKeyboard.querySelector(`.key[data-key="${letter}"]`);
    if (keyBtn) {
      keyBtn.classList.remove('correct', 'present', 'absent');
      keyBtn.classList.add(state);
    }
  }

  // Physical Keyboard Listener
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    handleKeyPress(e.key);
  });

  // Virtual Keyboard Click Listener
  virtualKeyboard.addEventListener('click', (e) => {
    const btn = e.target.closest('.key');
    if (!btn) return;
    const key = btn.dataset.key;
    handleKeyPress(key);
  });

  // -------------------------------------------------------------
  // TIMER
  // -------------------------------------------------------------
  function startTimer() {
    stopTimer();
    updateTimerDisplay();
    timerInterval = setInterval(updateTimerDisplay, 1000);
  }

  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }

  function updateTimerDisplay() {
    if (!roundStartTime) return;
    const elapsedSec = Math.floor((Date.now() - roundStartTime) / 1000);
    const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
    const secs = String(elapsedSec % 60).padStart(2, '0');
    gameTimer.textContent = `${mins}:${secs}`;
  }

  // -------------------------------------------------------------
  // GAME OVER & LEADERBOARD MODAL
  // -------------------------------------------------------------
  function showGameOverModal(targetWord, leaderboard, roundNum) {
    revealWord.textContent = targetWord;
    modalResults.classList.remove('hidden');

    // Trigger confetti if you won or came in top 3
    const myRank = leaderboard.find(p => p.id === socket.id);
    if (myRank && (myRank.rank <= 3 || myRank.solved)) {
      launchConfetti();
    }

    // Render Podium (Top 3)
    renderPodium(leaderboard);

    // Render full standings
    renderLeaderboardList(leaderboard);
  }

  function renderPodium(leaderboard) {
    podiumSection.innerHTML = '';
    const top3 = leaderboard.slice(0, 3);
    if (top3.length === 0) return;

    // Visual order: 2nd (left), 1st (center), 3rd (right)
    const order = [];
    if (top3[1]) order.push({ ...top3[1], spotClass: 'second', place: '🥈 2nd' });
    if (top3[0]) order.push({ ...top3[0], spotClass: 'first', place: '👑 1st' });
    if (top3[2]) order.push({ ...top3[2], spotClass: 'third', place: '🥉 3rd' });

    order.forEach((p) => {
      const spot = document.createElement('div');
      spot.className = `podium-spot ${p.spotClass}`;
      const timeStr = p.timeTakenSeconds ? `${p.timeTakenSeconds}s` : '--';
      const scoreStr = p.solved ? `${p.numGuesses}/6` : 'X/6';

      spot.innerHTML = `
        <div class="podium-avatar">${getAvatarSvg(p.avatarId)}</div>
        <div class="podium-name">${escapeHtml(p.name)}</div>
        <div class="podium-stats">${scoreStr} • ${timeStr}</div>
        <div class="podium-pillar">${p.rank}</div>
      `;
      podiumSection.appendChild(spot);
    });
  }

  function renderLeaderboardList(leaderboard) {
    leaderboardList.innerHTML = '';

    leaderboard.forEach((p) => {
      const row = document.createElement('div');
      row.className = 'leaderboard-row';
      const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `${p.rank}.`;
      const timeStr = p.timeTakenSeconds ? `⏱️ ${p.timeTakenSeconds}s` : 'DNF';
      const guessesStr = p.solved ? `${p.numGuesses}/6 Guesses` : 'Did not solve';

      row.innerHTML = `
        <div class="leaderboard-rank">${medal}</div>
        <div class="leaderboard-avatar">${getAvatarSvg(p.avatarId)}</div>
        <div class="leaderboard-info">
          <div class="leaderboard-name">${escapeHtml(p.name)} ${p.id === socket.id ? '(You)' : ''}</div>
          <div class="score-time">${timeStr}</div>
        </div>
        <div class="leaderboard-score">
          <span class="score-guesses ${p.solved ? 'won' : 'lost'}">${guessesStr}</span>
        </div>
      `;
      leaderboardList.appendChild(row);
    });
  }

  // Share Results
  btnShareResults.addEventListener('click', () => {
    const roundTitle = `Wordle Battle (Room: ${currentRoomCode}) - Round ${currentRound}`;
    const scoreSummary = myGameStatus === 'solved' ? `${playerGuessesHistory.length}/6` : 'X/6';
    let text = `${roundTitle}\nScore: ${scoreSummary}\n\n`;

    playerGuessesHistory.forEach((rowColors) => {
      rowColors.forEach((color) => {
        if (color === 'correct') text += '🟩';
        else if (color === 'present') text += '🟨';
        else text += '⬜';
      });
      text += '\n';
    });

    text += `\nPlay at: ${window.location.origin}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Game results copied to clipboard!');
      });
    } else {
      showToast('Copied results!');
    }
  });

  // -------------------------------------------------------------
  // CONFETTI CELEBRATION
  // -------------------------------------------------------------
  function launchConfetti() {
    const ctx = confettiCanvas.getContext('2d');
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;

    const pieces = [];
    const colors = ['#6aaa64', '#c9b458', '#3b82f6', '#ec4899', '#f97316', '#a855f7'];

    for (let i = 0; i < 90; i++) {
      pieces.push({
        x: Math.random() * confettiCanvas.width,
        y: Math.random() * confettiCanvas.height - confettiCanvas.height,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        velY: Math.random() * 3 + 2,
        velX: (Math.random() - 0.5) * 3,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 8
      });
    }

    let animationFrame = null;
    let startTime = Date.now();

    function renderConfetti() {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      const elapsed = Date.now() - startTime;

      pieces.forEach((p) => {
        p.y += p.velY;
        p.x += p.velX;
        p.rotation += p.rotSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (elapsed < 4000) {
        animationFrame = requestAnimationFrame(renderConfetti);
      } else {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }

    renderConfetti();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
  }
});
