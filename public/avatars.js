// High quality SVG avatars styled with vibrant backgrounds and distinctive characters
const AVATARS = [
  {
    id: 0,
    name: 'Shadow',
    bg: '#818cf8',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg0" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#818cf8"/>
          <stop offset="100%" stop-color="#4f46e5"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#bg0)"/>
      <!-- Body -->
      <path d="M26 95 C26 75, 40 70, 50 70 C60 70, 74 75, 74 95 Z" fill="#1e1b4b"/>
      <path d="M42 70 L50 78 L58 70 Z" fill="#fbbf24"/>
      <!-- Neck & Face -->
      <path d="M44 60 L56 60 L56 72 L44 72 Z" fill="#fcd34d"/>
      <ellipse cx="50" cy="48" rx="20" ry="22" fill="#fef3c7"/>
      <!-- Hair -->
      <path d="M26 44 C26 26, 38 18, 50 18 C62 18, 74 26, 74 44 C74 40, 68 28, 50 28 C34 28, 28 38, 26 44 Z" fill="#312e81"/>
      <path d="M30 35 L40 22 L45 32 L55 20 L60 32 L70 24 L68 38 Z" fill="#312e81"/>
      <!-- Face features -->
      <ellipse cx="43" cy="48" rx="2.5" ry="3.5" fill="#1e1b4b"/>
      <ellipse cx="57" cy="48" rx="2.5" ry="3.5" fill="#1e1b4b"/>
      <circle cx="44" cy="47" r="1" fill="#fff"/>
      <circle cx="58" cy="47" r="1" fill="#fff"/>
      <path d="M47 56 Q50 59 53 56" stroke="#d97706" stroke-width="2" stroke-linecap="round" fill="none"/>
    </svg>`
  },
  {
    id: 1,
    name: 'Aura',
    bg: '#f472b6',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f472b6"/>
          <stop offset="100%" stop-color="#db2777"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#bg1)"/>
      <path d="M24 95 C24 74, 38 68, 50 68 C62 68, 76 74, 76 95 Z" fill="#4338ca"/>
      <path d="M43 68 L50 77 L57 68 Z" fill="#f43f5e"/>
      <ellipse cx="50" cy="47" rx="19" ry="21" fill="#fde68a"/>
      <!-- Bangs and hair -->
      <path d="M22 52 C22 28, 32 16, 50 16 C68 16, 78 28, 78 52 C78 58, 72 40, 68 34 C58 24, 42 24, 32 34 C28 40, 22 58, 22 52 Z" fill="#6d28d9"/>
      <path d="M30 40 Q42 46 50 36 Q58 46 70 40 Q65 28 50 28 Q35 28 30 40 Z" fill="#6d28d9"/>
      <!-- Eyes with stylish lashes -->
      <ellipse cx="43" cy="47" rx="3" ry="3.5" fill="#4338ca"/>
      <ellipse cx="57" cy="47" rx="3" ry="3.5" fill="#4338ca"/>
      <circle cx="44.5" cy="46" r="1.2" fill="#fff"/>
      <circle cx="58.5" cy="46" r="1.2" fill="#fff"/>
      <path d="M46 56 Q50 60 54 56" stroke="#e11d48" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    </svg>`
  },
  {
    id: 2,
    name: 'Pixel',
    bg: '#34d399',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#34d399"/>
          <stop offset="100%" stop-color="#059669"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#bg2)"/>
      <path d="M26 95 C26 76, 40 72, 50 72 C60 72, 74 76, 74 95 Z" fill="#064e3b"/>
      <ellipse cx="50" cy="48" rx="20" ry="21" fill="#fed7aa"/>
      <!-- Cap / Beanie -->
      <path d="M26 40 C26 22, 38 16, 50 16 C62 16, 74 22, 74 40 L26 40 Z" fill="#047857"/>
      <path d="M20 40 L80 40 L76 46 L24 46 Z" fill="#065f46"/>
      <!-- Round Glasses -->
      <circle cx="42" cy="49" r="6" stroke="#047857" stroke-width="2.5" fill="#ecfdf5"/>
      <circle cx="58" cy="49" r="6" stroke="#047857" stroke-width="2.5" fill="#ecfdf5"/>
      <line x1="48" y1="49" x2="52" y2="49" stroke="#047857" stroke-width="2.5"/>
      <circle cx="42" cy="49" r="2" fill="#064e3b"/>
      <circle cx="58" cy="49" r="2" fill="#064e3b"/>
      <path d="M47 59 Q50 62 53 59" stroke="#ea580c" stroke-width="2" stroke-linecap="round" fill="none"/>
    </svg>`
  },
  {
    id: 3,
    name: 'Blaze',
    bg: '#fb923c',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fb923c"/>
          <stop offset="100%" stop-color="#ea580c"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#bg3)"/>
      <path d="M25 95 C25 75, 38 70, 50 70 C62 70, 75 75, 75 95 Z" fill="#7c2d12"/>
      <ellipse cx="50" cy="48" rx="19" ry="21" fill="#fde68a"/>
      <!-- Headband -->
      <path d="M28 38 L72 38 L72 46 L28 46 Z" fill="#dc2626"/>
      <!-- Wild orange/red hair -->
      <path d="M25 38 L30 18 L38 28 L48 14 L54 26 L64 16 L70 38 Z" fill="#b91c1c"/>
      <!-- Eyes -->
      <ellipse cx="43" cy="50" rx="2.5" ry="3" fill="#451a03"/>
      <ellipse cx="57" cy="50" rx="2.5" ry="3" fill="#451a03"/>
      <!-- Smile -->
      <path d="M45 58 Q50 63 55 58" stroke="#9a3412" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    </svg>`
  },
  {
    id: 4,
    name: 'Nova',
    bg: '#a855f7',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#c084fc"/>
          <stop offset="100%" stop-color="#7e22ce"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#bg4)"/>
      <path d="M25 95 C25 76, 39 70, 50 70 C61 70, 75 76, 75 95 Z" fill="#3b0764"/>
      <ellipse cx="50" cy="48" rx="19" ry="21" fill="#fbcfe8"/>
      <!-- Cool futuristic visor -->
      <path d="M28 42 C28 42, 38 40, 50 40 C62 40, 72 42, 72 42 L70 52 C70 52, 60 55, 50 55 C40 55, 30 52, 30 52 Z" fill="#06b6d4"/>
      <line x1="33" y1="46" x2="67" y2="46" stroke="#e0f2fe" stroke-width="2" stroke-linecap="round"/>
      <!-- Sleek haircut -->
      <path d="M26 44 C26 26, 38 20, 50 20 C62 20, 74 26, 74 44 C66 32, 54 30, 50 30 C46 30, 34 32, 26 44 Z" fill="#581c87"/>
      <path d="M47 60 Q50 63 53 60" stroke="#be185d" stroke-width="2" stroke-linecap="round" fill="none"/>
    </svg>`
  },
  {
    id: 5,
    name: 'Echo',
    bg: '#38bdf8',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg5" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#0284c7"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#bg5)"/>
      <path d="M26 95 C26 75, 40 70, 50 70 C60 70, 74 75, 74 95 Z" fill="#0c4a6e"/>
      <ellipse cx="50" cy="48" rx="19" ry="21" fill="#fed7aa"/>
      <!-- Headphones band -->
      <path d="M25 46 C25 24, 34 16, 50 16 C66 16, 75 24, 75 46" stroke="#0f172a" stroke-width="4" fill="none"/>
      <!-- Ear cups -->
      <rect x="22" y="40" width="8" height="16" rx="4" fill="#0284c7"/>
      <rect x="70" y="40" width="8" height="16" rx="4" fill="#0284c7"/>
      <!-- Hair -->
      <path d="M30 38 C32 26, 42 22, 50 22 C58 22, 68 26, 70 38 C64 30, 56 30, 50 30 C44 30, 36 30, 30 38 Z" fill="#1e293b"/>
      <!-- Eyes -->
      <circle cx="43" cy="49" r="2.5" fill="#0f172a"/>
      <circle cx="57" cy="49" r="2.5" fill="#0f172a"/>
      <path d="M46 58 Q50 62 54 58" stroke="#c2410c" stroke-width="2" stroke-linecap="round" fill="none"/>
    </svg>`
  },
  {
    id: 6,
    name: 'Spark',
    bg: '#facc15',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg6" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fde047"/>
          <stop offset="100%" stop-color="#eab308"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#bg6)"/>
      <path d="M26 95 C26 75, 40 70, 50 70 C60 70, 74 75, 74 95 Z" fill="#713f12"/>
      <ellipse cx="50" cy="48" rx="20" ry="22" fill="#ffedd5"/>
      <!-- Anime messy hair -->
      <path d="M25 42 L32 20 L40 30 L52 14 L58 28 L68 18 L75 42 L68 34 L50 32 L32 34 Z" fill="#854d0e"/>
      <!-- Eyes -->
      <ellipse cx="43" cy="48" rx="3" ry="3.5" fill="#451a03"/>
      <ellipse cx="57" cy="48" rx="3" ry="3.5" fill="#451a03"/>
      <circle cx="44" cy="47" r="1.2" fill="#fff"/>
      <circle cx="58" cy="47" r="1.2" fill="#fff"/>
      <!-- Cheerful smile -->
      <path d="M44 56 Q50 62 56 56" stroke="#b45309" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    </svg>`
  },
  {
    id: 7,
    name: 'Vortex',
    bg: '#2dd4bf',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg7" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2dd4bf"/>
          <stop offset="100%" stop-color="#0f766e"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#bg7)"/>
      <path d="M25 95 C25 75, 39 70, 50 70 C61 70, 75 75, 75 95 Z" fill="#134e4a"/>
      <ellipse cx="50" cy="48" rx="19" ry="21" fill="#fef3c7"/>
      <!-- Hoodie rim -->
      <path d="M24 48 C24 22, 36 18, 50 18 C64 18, 76 22, 76 48 C76 72, 68 76, 50 76 C32 76, 24 72, 24 48 Z" fill="none" stroke="#115e59" stroke-width="5"/>
      <!-- Eyes -->
      <ellipse cx="43" cy="48" rx="2.5" ry="3" fill="#134e4a"/>
      <ellipse cx="57" cy="48" rx="2.5" ry="3" fill="#134e4a"/>
      <path d="M46 58 Q50 61 54 58" stroke="#d97706" stroke-width="2" stroke-linecap="round" fill="none"/>
    </svg>`
  }
];

function getAvatarSvg(avatarId) {
  const av = AVATARS.find(a => a.id === Number(avatarId)) || AVATARS[0];
  return av.svg;
}
