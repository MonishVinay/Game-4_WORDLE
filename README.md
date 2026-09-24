# 🎮 Wordle Battle Online (1–8 Players)

A real-time multiplayer Wordle room game designed for 1 to 8 players. Built with **Node.js**, **Express**, **Socket.IO**, and responsive front-end components matching the Wordle Battle mockup.

---

## 🌟 Key Features

1. **Multiplayer Rooms (1–8 Players)**:
   - Create private battle rooms or join via a 6-character room code or shareable direct URL link (`?room=CODE`).
   - Supports 1 to 8 concurrent players per room.
   - Host controls game start and next rounds.

2. **Pixel-Matched UI (Matching Your Mockup)**:
   - **Left Sidebar**: "INVITE FRIENDS" pill button (1-click link copying) and **live opponent cards** featuring stylized circular avatars and real-time $5 \times 6$ mini-grids displaying opponents' colored progress (Green, Yellow, Gray) without spoiling letters!
   - **Center Board**: Full $5 \times 6$ Wordle guess grid with 3D flip reveal animations, tile bounce on win, and row shake on invalid words.
   - **Virtual & Physical Keyboard**: On-screen interactive QWERTY keyboard with color memory (Green > Yellow > Gray) and seamless desktop keyboard support.

3. **Curated Word List**:
   - The hidden mystery words are selected exclusively from the **938 curated 5-letter common words** extracted from your document (`1000 Common 5-Letter Words`).
   - Over 5,700 legitimate English words are accepted as valid guesses so players never get blocked by rare vocabulary.

4. **Leaderboard & Win Condition (Tie-Breaker Rule)**:
   - **1st Criteria**: Solved before Failed.
   - **2nd Criteria**: **Least moves taken** (e.g. 2 guesses beats 3 guesses).
   - **3rd Criteria (Tie-breaker)**: **Fastest time taken** (e.g. 25.4s beats 32.1s).
   - Winners Podium (🥇 1st, 🥈 2nd, 🥉 3rd) with celebratory confetti and full scoreboard.
   - 1-click "Share Results" (generates Wordle emoji grid for chat apps).

---

## 🚀 How to Run Locally

1. Open your terminal in this directory:
   ```bash
   cd c:\Users\monis\Desktop\FULLSTACK\Games-antigravity\WORDLE_ONLINE
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```
4. To test multiplayer locally, open multiple browser tabs or an incognito window, create a room in one, and join with the room code in the others!

---

## 🌍 Playing with Friends Across Other Countries

To allow friends from anywhere in the world to join your room without port-forwarding, you have multiple simple, free options:

### Option A: Free Instant Tunnel (Zero Installation with npx)
Run this command in a second terminal while your server is running:
```bash
npx localtunnel --port 3000
```
This gives you an instant public HTTPS link (e.g. `https://cool-wordle.loca.lt`) you can send to anyone worldwide!

### Option B: Cloudflare Tunnel (Free & Fast)
If you have `cloudflared` installed:
```bash
cloudflared tunnel --url http://localhost:3000
```

### Option C: 1-Click Free Cloud Deployment (Render / Railway / Glitch)
Push this repository to GitHub and connect it to [Render.com](https://render.com) or [Railway.app](https://railway.app):
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- It will give you a permanent global URL (e.g. `https://wordle-battle.onrender.com`).
