# 🎮 Wordle Battle Online (1–8 Players)

A real-time multiplayer Wordle room game designed for 1 to 8 players. Built with **Node.js**, **Express**, **Socket.IO**, and responsive front-end components.

---

## 🌟 3 Exciting Game Modes

### 🏆 Mode 1: Classic Battle
- **Rules**: Standard Wordle rules. All players in the room play the **same secret word**.
- **Guesses**: **6 guesses** max per word.
- **Winner Criteria**:
  1. Solved vs Unsolved (solved first)
  2. **Fewest moves taken** (e.g. 2 guesses beats 3 guesses)
  3. **Tie-breaker**: **Fastest time taken** (e.g. 25.4s beats 32.1s)

### ⚡ Mode 2: Time Rush (Endless Words against the Clock)
- **Time Selection**: Host selects time limit: **2 to 15 minutes** (e.g. 2m, 3m, 5m, 8m, 10m, 15m).
- **Guesses**: **8 guesses** instead of standard 6!
- **Endless Questions**: When a player finishes a word (solved or 8 guesses), they immediately advance to the next wordle! Players can answer as many questions as they can before the clock runs out.
- **Live Leaderboard**: Displays in real time in the sidebar and updates every time any player finishes a word!
- **Winner Criteria (in strict order)**:
  1. **Most wordles solved**
  2. **Fewer number of total guesses**
  3. **Fewer number of unguessed words**
  4. Tie-breaker: Time of last solved word

### 🎯 Mode 3: Sprint Gauntlet (Fixed Questions with Time Limit)
- **Settings**: Host chooses **Time Limit** (2–15 mins) AND **Number of Questions** (3, 5, 7, 10, or 15 words).
- **Guesses**: **5 guesses only** per word!
- **Goal**: Race through the $N$ questions before time expires.
- **Winner Criteria**:
  1. **Most questions solved** (out of $N$)
  2. **Fewer total guesses**
  3. Tie-breaker: Total completion time

---

## 🎨 Features & Real-Time Opponent View
- **Opponent Sidebar Cards**: Shows opponents' avatars, live question progress (e.g. `Word #4 • 3 Solved`), and their live mini-grid of tiles (Green, Yellow, Gray) updated in real-time without revealing secret letters.
- **Dynamic Board**: Scales automatically between 5, 6, and 8 rows based on the selected mode.
- **Live Timer**: Shows elapsed time in Mode 1, or pulsating countdown timer in Mode 2 & 3.
- **Curated Word List**: Hidden mystery words are selected from **938 curated 5-letter common words**, backed by 5,758 valid English guess words.
- **Confetti & Winner Podium**: 🥇 1st, 🥈 2nd, 🥉 3rd podium celebration with detailed standings and a 1-click "Share Results" emoji generator.

---

## 🚀 Running Locally

```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Open multiple tabs to test multiplayer!

Run the automated test suite:
```bash
npm test
```
