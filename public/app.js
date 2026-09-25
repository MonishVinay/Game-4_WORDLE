// Wordle Battle Client Application - 3 Game Modes
document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  // App & Room State
  let currentView = 'landing';
  let myPlayerId = null;
  let currentRoomCode = null;
  let isHost = false;
  let selectedAvatarId = 0;
  let currentRound = 1;
  let roundStartTime = null;
  let timerInterval = null;

  // Game Mode & Settings State
  let gameMode = 'mode1'; // 'mode1' | 'mode2' | 'mode3'
  let timeLimitMinutes = 5;
  let timeLimitSeconds = 0;
  let numQuestions = 5;
  let maxGuessesPerWord = 6;

  // Player Match State
  let currentWordIndex = 0;
  let wordsSolved = 0;
  let wordsFailed = 0;
  let totalGuesses = 0;
  let currentRow = 0;
  let currentGuess = '';
  let isInputLocked = false;
  let myPlayerStatus = 'playing'; // 'playing' | 'solved' | 'failed' | 'finished'
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

  // DOM Elements - Waiting Room & Mode Select
  const waitingRoomCode = document.getElementById('waiting-room-code');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const modeRoleIndicator = document.getElementById('mode-role-indicator');
  const modeCards = document.querySelectorAll('.mode-card');
  const modeSettingsBox = document.getElementById('mode-settings-box');
  const timeLimitGroup = document.getElementById('time-limit-group');
  const questionsCountGroup = document.getElementById('questions-count-group');
  const timeLimitPills = document.querySelectorAll('#time-limit-pills .pill-btn');
  const questionsCountPills = document.querySelectorAll('#questions-count-pills .pill-btn');
  const summaryBadgeText = document.getElementById('summary-badge-text');
  const playerCountBadge = document.getElementById('player-count-badge');
  const lobbyPlayerList = document.getElementById('lobby-player-list');
  const btnStartGame = document.getElementById('btn-start-game');
  const waitingHostNotice = document.getElementById('waiting-host-notice');
  const btnLeaveWaiting = document.getElementById('btn-leave-waiting');

  // DOM Elements - Game
  const gameRoomCode = document.getElementById('game-room-code');
  const btnCopyGameRoom = document.getElementById('btn-copy-game-room');
  const gameModeBadge = document.getElementById('game-mode-badge');
  const gameTimerBadge = document.getElementById('game-timer-badge');
  const gameTimerIcon = document.getElementById('game-timer-icon');
  const gameTimer = document.getElementById('game-timer');
  const gameScoreBadge = document.getElementById('game-score-badge');
  const scoreSolvedCount = document.getElementById('score-solved-count');
  const scoreWordIndicator = document.getElementById('score-word-indicator');
  const btnLeaveGame = document.getElementById('btn-leave-game');
  const btnInviteSidebar = document.getElementById('btn-invite-sidebar');
  const liveLeaderboardWidget = document.getElementById('live-leaderboard-widget');
  const liveLbItems = document.getElementById('live-lb-items');
  const opponentsList = document.getElementById('opponents-list');
  const wordleBoard = document.getElementById('wordle-board');
  const virtualKeyboard = document.getElementById('virtual-keyboard');
  const boardAlert = document.getElementById('board-alert');

  // DOM Elements - Modal Results
  const resultsModalTitle = document.getElementById('results-modal-title');
  const resultsSecretReveal = document.getElementById('results-secret-reveal');
  const revealWord = document.getElementById('reveal-word');
  const podiumSection = document.getElementById('podium-section');
  const resultsRankingRuleNote = document.getElementById('results-ranking-rule-note');
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
  function showToast(message, duration = 2200) {
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
  // LOBBY & GAME MODE CONTROLS
  // -------------------------------------------------------------
  // Mode card clicks (Host only)
  modeCards.forEach((card) => {
    card.addEventListener('click', () => {
      if (!isHost) return;
      const selectedMode = card.dataset.mode;
      gameMode = selectedMode;
      updateModeUI();
      emitRoomSettings();
    });
  });

  // Time Limit pills
  timeLimitPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!isHost) return;
      timeLimitMinutes = parseInt(btn.dataset.time, 10) || 5;
      timeLimitPills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateModeSummary();
      emitRoomSettings();
    });
  });

  // Questions count pills
  questionsCountPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!isHost) return;
      numQuestions = parseInt(btn.dataset.count, 10) || 5;
      questionsCountPills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateModeSummary();
      emitRoomSettings();
    });
  });

  function emitRoomSettings() {
    socket.emit('update_room_settings', {
      roomCode: currentRoomCode,
      gameMode,
      timeLimitMinutes,
      numQuestions
    });
  }

  function updateModeUI() {
    modeCards.forEach(c => {
      c.classList.toggle('active', c.dataset.mode === gameMode);
      if (!isHost) {
        c.style.cursor = 'default';
      } else {
        c.style.cursor = 'pointer';
      }
    });

    if (isHost) {
      modeRoleIndicator.textContent = '👑 Host Controls';
      if (gameMode === 'mode1') {
        modeSettingsBox.classList.add('hidden');
        timeLimitGroup.classList.add('hidden');
        questionsCountGroup.classList.add('hidden');
      } else if (gameMode === 'mode2') {
        modeSettingsBox.classList.remove('hidden');
        timeLimitGroup.classList.remove('hidden');
        questionsCountGroup.classList.add('hidden');
      } else if (gameMode === 'mode3') {
        modeSettingsBox.classList.remove('hidden');
        timeLimitGroup.classList.remove('hidden');
        questionsCountGroup.classList.remove('hidden');
      }
    } else {
      modeRoleIndicator.textContent = 'Host Selects';
      modeSettingsBox.classList.add('hidden');
    }

    updateModeSummary();
  }

  function updateModeSummary() {
    if (gameMode === 'mode1') {
      summaryBadgeText.textContent = '🏆 Mode 1: Classic (1 Shared Word • 6 Guesses • Untimed)';
    } else if (gameMode === 'mode2') {
      summaryBadgeText.textContent = `⚡ Mode 2: Time Rush (Endless Words • ⏱️ ${timeLimitMinutes} Mins • 8 Guesses/Word)`;
    } else if (gameMode === 'mode3') {
      summaryBadgeText.textContent = `🎯 Mode 3: Sprint (${numQuestions} Questions • ⏱️ ${timeLimitMinutes} Mins • 5 Guesses/Word)`;
    }
  }

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
    if (isHost) {
      socket.emit('return_to_lobby', { roomCode: currentRoomCode });
    } else {
      modalResults.classList.add('hidden');
      switchView('waiting');
    }
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

  socket.on('room_returned_to_lobby', (room) => {
    handleRoomUpdate(room);
    modalResults.classList.add('hidden');
    stopTimer();
    switchView('waiting');
    showToast('Returned to room lobby');
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
    showToast(`${getModeTitle(gameMode)} Started! Good luck!`, 2500);
  });

  socket.on('guess_error', ({ message }) => {
    isInputLocked = false;
    showBoardAlert(message);
    shakeCurrentRow();
  });

  socket.on('guess_result', ({
    guess,
    colors,
    rowIndex,
    wordSolved,
    wordFailed,
    wordFinished,
    targetWordRevealed,
    currentWordIndex: wordIdx,
    wordsSolved: sCount,
    wordsFailed: fCount,
    totalGuesses: gCount,
    playerStatus,
    advanceNextWord,
    finishTimeMs
  }) => {
    playerGuessesHistory.push(colors);

    revealRowResult(rowIndex, guess, colors, () => {
      isInputLocked = false;
      wordsSolved = sCount;
      wordsFailed = fCount;
      totalGuesses = gCount;
      myPlayerStatus = playerStatus;

      updateScoreBadge();

      if (wordFinished) {
        if (wordSolved) {
          bounceRow(rowIndex);
          if (gameMode === 'mode1') {
            const timeSec = (finishTimeMs / 1000).toFixed(1);
            showToast(`🎉 SOLVED in ${rowIndex + 1} guesses! (${timeSec}s)`, 3500);
            isInputLocked = true;
          } else {
            showToast(`🎉 Word #${wordIdx + 1} Solved!`, 1500);
          }
        } else if (wordFailed) {
          if (gameMode === 'mode1') {
            showToast(`Out of guesses! The word was ${targetWordRevealed}.`, 3500);
            isInputLocked = true;
          } else {
            showToast(`Word was "${targetWordRevealed}". Next word...`, 2000);
          }
        }

        if (advanceNextWord) {
          isInputLocked = true;
          setTimeout(() => {
            currentWordIndex++;
            resetBoardForNextWord();
            isInputLocked = false;
          }, 800);
        } else if (gameMode === 'mode3' && playerStatus === 'finished') {
          isInputLocked = true;
          showToast(`🏁 Finished all questions! Waiting for other players...`, 4000);
        }
      } else {
        currentRow++;
        currentGuess = '';
      }
    });
  });

  socket.on('opponent_progress', ({
    playerId,
    rowIndex,
    colors,
    currentWordIndex: oppWordIdx,
    wordsSolved: oppSolved,
    wordsFailed: oppFailed,
    totalGuesses: oppTotalGuesses,
    wordSolved,
    wordFailed,
    wordFinished,
    status
  }) => {
    updateOpponentCard(playerId, rowIndex, colors, oppWordIdx, oppSolved, oppFailed, oppTotalGuesses, wordFinished, status);
  });

  socket.on('live_leaderboard_update', ({ leaderboard, gameMode: mode }) => {
    renderLiveLeaderboard(leaderboard, mode);
  });

  socket.on('game_over', ({ gameMode: mode, targetWord, leaderboard, roundNumber }) => {
    stopTimer();
    setTimeout(() => {
      showGameOverModal(mode, targetWord, leaderboard, roundNumber);
    }, 1000);
  });

  // -------------------------------------------------------------
  // ROOM STATE RENDERING
  // -------------------------------------------------------------
  function handleRoomUpdate(room) {
    currentRoomCode = room.code;
    isHost = room.hostId === socket.id;
    gameMode = room.gameMode || 'mode1';
    timeLimitMinutes = room.timeLimitMinutes || 5;
    timeLimitSeconds = room.timeLimitSeconds || (gameMode !== 'mode1' ? timeLimitMinutes * 60 : 0);
    numQuestions = room.numQuestions || 5;
    maxGuessesPerWord = room.maxGuessesPerWord || (gameMode === 'mode2' ? 8 : (gameMode === 'mode3' ? 5 : 6));

    // Update Waiting View
    waitingRoomCode.textContent = room.code;
    gameRoomCode.textContent = `ROOM: ${room.code}`;
    playerCountBadge.textContent = `${room.players.length} / ${room.maxPlayers}`;

    // Update Mode Select UI
    updateModeUI();

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

  function getModeTitle(mode) {
    if (mode === 'mode1') return 'Classic';
    if (mode === 'mode2') return `Time Rush (${timeLimitMinutes}m)`;
    if (mode === 'mode3') return `Sprint (${numQuestions} Words)`;
    return 'Classic';
  }

  function renderOpponentsSidebar(players) {
    opponentsList.innerHTML = '';
    const otherPlayers = players.filter(p => p.id !== socket.id);

    // Show/hide live leaderboard widget in sidebar for Mode 2 & 3
    if (gameMode === 'mode2' || gameMode === 'mode3') {
      liveLeaderboardWidget.classList.remove('hidden');
    } else {
      liveLeaderboardWidget.classList.add('hidden');
    }

    otherPlayers.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'opponent-card';
      card.id = `opponent-card-${p.id}`;
      card.dataset.currentWordIdx = p.currentWordIndex || 0;

      const statusText = formatOpponentStatus(p.status, p.currentWordIndex || 0, p.wordsSolved || 0, p.numGuesses || 0);

      // Build mini grid HTML with maxGuessesPerWord rows
      let miniGridHtml = '<div class="mini-grid">';
      for (let r = 0; r < maxGuessesPerWord; r++) {
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

  function formatOpponentStatus(status, wordIdx, solvedCount, currentWordGuesses) {
    if (gameMode === 'mode1') {
      if (status === 'solved') return '🎉 Solved!';
      if (status === 'failed') return 'Failed (6/6)';
      return currentWordGuesses > 0 ? `Guess ${currentWordGuesses}/6` : 'Thinking...';
    }

    if (gameMode === 'mode2') {
      return `Word #${wordIdx + 1} • ${solvedCount} Solved`;
    }

    if (gameMode === 'mode3') {
      if (status === 'finished') return `🏁 Finished (${solvedCount}/${numQuestions})`;
      return `Word ${wordIdx + 1}/${numQuestions} • ${solvedCount} Solved`;
    }

    return 'Playing';
  }

  function updateOpponentCard(playerId, rowIndex, colors, wordIdx, oppSolved, oppFailed, oppTotalGuesses, wordFinished, status) {
    const card = document.getElementById(`opponent-card-${playerId}`);
    if (!card) return;

    // Check if opponent moved to a new wordle
    const prevWordIdx = parseInt(card.dataset.currentWordIdx, 10) || 0;
    if (wordIdx !== prevWordIdx) {
      card.dataset.currentWordIdx = wordIdx;
      // Clear mini-grid for the new word
      card.querySelectorAll('.mini-cell').forEach(cell => {
        cell.className = 'mini-cell';
      });
    }

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
      statusEl.textContent = formatOpponentStatus(status, wordIdx, oppSolved, rowIndex + 1);
      if (status === 'solved' || wordFinished) {
        statusEl.classList.add('solved');
      }
    }
  }

  function renderLiveLeaderboard(leaderboard, mode) {
    if (!liveLbItems) return;
    liveLbItems.innerHTML = '';

    leaderboard.slice(0, 5).forEach((p) => {
      const row = document.createElement('div');
      row.className = `live-lb-row ${p.id === socket.id ? 'is-you' : ''}`;
      
      let rightText = '';
      if (mode === 'mode2') {
        rightText = `${p.wordsSolved} ⭐ (${p.totalGuesses}g)`;
      } else if (mode === 'mode3') {
        rightText = `${p.wordsSolved}/${p.totalQuestions} ⭐ (${p.totalGuesses}g)`;
      } else {
        rightText = p.solved ? `${p.numGuesses}g` : '...';
      }

      row.innerHTML = `
        <div class="live-lb-left">
          <span class="live-lb-rank">${p.rank}.</span>
          <span class="live-lb-name">${escapeHtml(p.name)}</span>
        </div>
        <div class="live-lb-right">${rightText}</div>
      `;
      liveLbItems.appendChild(row);
    });
  }

  // -------------------------------------------------------------
  // GAME BOARD & KEYBOARD
  // -------------------------------------------------------------
  function setupGameBoard() {
    currentRow = 0;
    currentGuess = '';
    currentWordIndex = 0;
    wordsSolved = 0;
    wordsFailed = 0;
    totalGuesses = 0;
    isInputLocked = false;
    myPlayerStatus = 'playing';
    keyStates = {};
    playerGuessesHistory = [];
    boardAlert.classList.add('hidden');

    // Update Header badges
    gameModeBadge.textContent = getModeTitle(gameMode);
    updateScoreBadge();

    // Build dynamic board (5x6, 5x8, or 5x5)
    wordleBoard.className = `wordle-board rows-${maxGuessesPerWord}`;
    wordleBoard.innerHTML = '';
    for (let r = 0; r < maxGuessesPerWord; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'board-row';
      rowEl.dataset.row = r;
      for (let c = 0; c < 5; c++) {
        const tileEl = document.createElement('div');
        tileEl.className = 'board-tile';
        tileEl.dataset.row = r;
        tileEl.dataset.col = c;
        rowEl.appendChild(tileEl);
      }
      wordleBoard.appendChild(rowEl);
    }

    // Reset keyboard keys
    resetKeyboardColors();
  }

  function resetBoardForNextWord() {
    currentRow = 0;
    currentGuess = '';
    // Clear all tiles
    wordleBoard.querySelectorAll('.board-tile').forEach(tile => {
      tile.textContent = '';
      tile.className = 'board-tile';
    });
    resetKeyboardColors();
    updateScoreBadge();
  }

  function resetKeyboardColors() {
    keyStates = {};
    document.querySelectorAll('.key').forEach((keyEl) => {
      keyEl.classList.remove('correct', 'present', 'absent');
    });
  }

  function updateScoreBadge() {
    if (gameMode === 'mode1') {
      gameScoreBadge.classList.add('hidden');
    } else if (gameMode === 'mode2') {
      gameScoreBadge.classList.remove('hidden');
      scoreSolvedCount.textContent = `⭐ ${wordsSolved} Solved`;
      scoreWordIndicator.textContent = `Word #${currentWordIndex + 1}`;
    } else if (gameMode === 'mode3') {
      gameScoreBadge.classList.remove('hidden');
      scoreSolvedCount.textContent = `⭐ ${wordsSolved}/${numQuestions} Solved`;
      scoreWordIndicator.textContent = `Word ${Math.min(currentWordIndex + 1, numQuestions)} of ${numQuestions}`;
    }
  }

  function handleKeyPress(key) {
    if (currentView !== 'game' || isInputLocked || myPlayerStatus !== 'playing') return;

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
    if (currentGuess.length >= 5) return;
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
    if (currentGuess.length < 5) {
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
    for (let c = 0; c < 5; c++) {
      const tile = getTile(row, c);
      if (tile) {
        setTimeout(() => {
          tile.classList.add('bounce');
        }, c * 80);
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
    const delayStep = 220;

    colors.forEach((color, colIndex) => {
      setTimeout(() => {
        const tile = getTile(rowIndex, colIndex);
        if (tile) {
          tile.classList.add('flip');
          setTimeout(() => {
            tile.classList.add(color);
            updateKeyColor(guess[colIndex].toUpperCase(), color);
          }, 200);
        }

        if (colIndex === colors.length - 1) {
          setTimeout(callback, 320);
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
  // TIMER (Count up for Mode 1, Countdown for Mode 2 & 3)
  // -------------------------------------------------------------
  function startTimer() {
    stopTimer();
    updateTimerDisplay();
    timerInterval = setInterval(updateTimerDisplay, 1000);
  }

  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    gameTimerBadge.classList.remove('warning');
  }

  function updateTimerDisplay() {
    if (!roundStartTime) return;
    const elapsedSec = Math.floor((Date.now() - roundStartTime) / 1000);

    if (gameMode === 'mode1') {
      gameTimerIcon.textContent = '⏱️';
      gameTimerBadge.classList.remove('warning');
      const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
      const secs = String(elapsedSec % 60).padStart(2, '0');
      gameTimer.textContent = `${mins}:${secs}`;
    } else {
      // Countdown timer for Mode 2 and Mode 3
      gameTimerIcon.textContent = '⏳';
      const remainingSec = Math.max(0, timeLimitSeconds - elapsedSec);
      const mins = String(Math.floor(remainingSec / 60)).padStart(2, '0');
      const secs = String(remainingSec % 60).padStart(2, '0');
      gameTimer.textContent = `${mins}:${secs}`;

      if (remainingSec <= 30) {
        gameTimerBadge.classList.add('warning');
      } else {
        gameTimerBadge.classList.remove('warning');
      }

      if (remainingSec <= 0) {
        stopTimer();
      }
    }
  }

  // -------------------------------------------------------------
  // GAME OVER & LEADERBOARD MODAL
  // -------------------------------------------------------------
  function showGameOverModal(mode, targetWord, leaderboard, roundNum) {
    modalResults.classList.remove('hidden');

    if (mode === 'mode1') {
      resultsModalTitle.textContent = 'ROUND COMPLETED!';
      resultsSecretReveal.classList.remove('hidden');
      revealWord.textContent = targetWord || '-----';
      resultsRankingRuleNote.textContent = 'Ranked by: 1) Solved • 2) Least Moves • 3) Fastest Time';
    } else if (mode === 'mode2') {
      resultsModalTitle.textContent = "TIME'S UP! FINAL STANDINGS";
      resultsSecretReveal.classList.add('hidden');
      resultsRankingRuleNote.textContent = 'Ranked by: 1) Most Solved • 2) Fewer Total Guesses • 3) Fewer Misses';
    } else if (mode === 'mode3') {
      resultsModalTitle.textContent = 'SPRINT GAUNTLET COMPLETED!';
      resultsSecretReveal.classList.add('hidden');
      resultsRankingRuleNote.textContent = 'Ranked by: 1) Most Solved • 2) Fewer Total Guesses • 3) Completion Time';
    }

    // Trigger confetti if top 3
    const myRank = leaderboard.find(p => p.id === socket.id);
    if (myRank && (myRank.rank <= 3 || myRank.wordsSolved > 0 || myRank.solved)) {
      launchConfetti();
    }

    // Render Podium
    renderPodium(leaderboard, mode);

    // Render Standings List
    renderLeaderboardList(leaderboard, mode);
  }

  function renderPodium(leaderboard, mode) {
    podiumSection.innerHTML = '';
    const top3 = leaderboard.slice(0, 3);
    if (top3.length === 0) return;

    // Visual order: 2nd (left), 1st (center), 3rd (right)
    const order = [];
    if (top3[1]) order.push({ ...top3[1], spotClass: 'second' });
    if (top3[0]) order.push({ ...top3[0], spotClass: 'first' });
    if (top3[2]) order.push({ ...top3[2], spotClass: 'third' });

    order.forEach((p) => {
      const spot = document.createElement('div');
      spot.className = `podium-spot ${p.spotClass}`;
      
      let statStr = '';
      if (mode === 'mode1') {
        const timeStr = p.timeTakenSeconds ? `${p.timeTakenSeconds}s` : '--';
        statStr = p.solved ? `${p.numGuesses}/6 • ${timeStr}` : 'X/6';
      } else if (mode === 'mode2') {
        statStr = `${p.wordsSolved} ⭐ • ${p.totalGuesses}g`;
      } else if (mode === 'mode3') {
        const timeStr = p.timeTakenSeconds ? `${p.timeTakenSeconds}s` : '';
        statStr = `${p.wordsSolved}/${p.totalQuestions} ⭐ ${timeStr}`;
      }

      spot.innerHTML = `
        <div class="podium-avatar">${getAvatarSvg(p.avatarId)}</div>
        <div class="podium-name">${escapeHtml(p.name)}</div>
        <div class="podium-stats">${statStr}</div>
        <div class="podium-pillar">${p.rank}</div>
      `;
      podiumSection.appendChild(spot);
    });
  }

  function renderLeaderboardList(leaderboard, mode) {
    leaderboardList.innerHTML = '';

    leaderboard.forEach((p) => {
      const row = document.createElement('div');
      row.className = 'leaderboard-row';
      const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `${p.rank}.`;

      let mainScoreText = '';
      let subScoreText = '';

      if (mode === 'mode1') {
        mainScoreText = p.solved ? `${p.numGuesses}/6 Guesses` : 'Did not solve';
        subScoreText = p.timeTakenSeconds ? `⏱️ ${p.timeTakenSeconds}s` : '';
      } else if (mode === 'mode2') {
        mainScoreText = `${p.wordsSolved} Words Solved`;
        subScoreText = `${p.totalGuesses} Guesses • ${p.wordsFailed} Missed`;
      } else if (mode === 'mode3') {
        mainScoreText = `${p.wordsSolved}/${p.totalQuestions} Questions Solved`;
        subScoreText = `${p.totalGuesses} Guesses • ${p.timeTakenSeconds ? p.timeTakenSeconds + 's' : 'DNF'}`;
      }

      row.innerHTML = `
        <div class="leaderboard-rank">${medal}</div>
        <div class="leaderboard-avatar">${getAvatarSvg(p.avatarId)}</div>
        <div class="leaderboard-info">
          <div class="leaderboard-name">${escapeHtml(p.name)} ${p.id === socket.id ? '(You)' : ''}</div>
          <div class="score-time">${subScoreText}</div>
        </div>
        <div class="leaderboard-score">
          <span class="score-guesses ${p.solved || p.wordsSolved > 0 ? 'won' : 'lost'}">${mainScoreText}</span>
        </div>
      `;
      leaderboardList.appendChild(row);
    });
  }

  // Share Results
  btnShareResults.addEventListener('click', () => {
    const roundTitle = `Wordle Battle (Room: ${currentRoomCode}) - ${getModeTitle(gameMode)}`;
    let summaryText = '';

    if (gameMode === 'mode1') {
      const scoreSummary = myPlayerStatus === 'solved' ? `${playerGuessesHistory.length}/6` : 'X/6';
      summaryText = `Score: ${scoreSummary}\n\n`;
      playerGuessesHistory.forEach((rowColors) => {
        rowColors.forEach((color) => {
          if (color === 'correct') summaryText += '🟩';
          else if (color === 'present') summaryText += '🟨';
          else summaryText += '⬜';
        });
        summaryText += '\n';
      });
    } else {
      summaryText = `Solved: ${wordsSolved} Words | Guesses: ${totalGuesses}\n`;
    }

    const fullText = `${roundTitle}\n${summaryText}\nPlay live at: ${window.location.origin}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText).then(() => {
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
