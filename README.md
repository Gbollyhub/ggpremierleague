# George Green Premier League (GPL)

A Sunday league football management platform inspired by EA Sports FC 26, built with React, Tailwind CSS v4, Framer Motion, Recharts, and Zustand.

![GPL](https://img.shields.io/badge/React-18-blue) ![GPL](https://img.shields.io/badge/Tailwind-v4-06B6D4) ![GPL](https://img.shields.io/badge/Vite-5-646CFF)

## Features

### Public Section
- **Players** — FC26-style player cards with ratings, attributes, and playstyle badges
- **Player Detail** — Full profile with radar chart, attribute bars, season stats
- **Team Sheets** — Match day formations with pitch visualisation (Red vs Blue)
- **Game Weeks** — Match results, goal scorers, team comparison charts
- **Leaderboard** — Season rankings by goals, assists, rating, MOTM

### Admin Section (Protected)
- **Dashboard** — Season overview with stat cards, charts, top performer
- **Player Management** — Create/edit/delete players with attribute sliders
- **Team Generator** — Auto-balance teams by position and rating
- **Game Week Manager** — Record matches, goals, assists → auto-updates ratings & stats

### UX
- Dark / Light mode toggle
- Smooth page transitions (Framer Motion)
- Toast notifications
- Mobile-responsive with sidebar drawer
- Glassmorphism card design

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

The dev server runs on `http://localhost:3000`.

## Admin Login

```
Email:    admin@gpl.com
Password: admin123
```

## Project Structure

```
src/
├── components/
│   ├── cards/          # PlayerCard, FormationDisplay
│   ├── charts/         # PlayerRadarChart
│   ├── layout/         # Sidebar, MobileSidebar
│   └── ui/             # Icons, ToastContainer, SharedUI
├── data/
│   ├── constants.js    # Positions, colors, playstyles
│   ├── players.js      # Initial player data
│   └── gameweeks.js    # Initial game week data
├── pages/
│   ├── public/         # Players, PlayerDetail, TeamSheets, GameWeek, Leaderboard
│   └── admin/          # Login, Dashboard, PlayerManagement, TeamGenerator, GWManager
├── store/
│   └── useStore.js     # Zustand global state
├── styles/
│   └── index.css       # Tailwind v4 + custom theme
├── utils/
│   └── players.js      # Rating calc, team balancing, helpers
├── App.jsx             # Root layout + page routing
└── main.jsx            # Entry point
```

## Rating System

Dynamic ratings update after each game week:

| Position   | Goals | Assists | Clean Sheet | Saves |
|-----------|-------|---------|-------------|-------|
| Forward   | +2    | +1.5    | —           | —     |
| Midfielder| +1.5  | +2      | —           | —     |
| Defender  | +1    | —       | +2          | —     |
| Goalkeeper| —     | —       | +2          | +1    |

Ratings are clamped between **50–99**. New players start at **75**.

## Tech Stack

- **React 18** + Vite 5
- **Tailwind CSS v4** (via @tailwindcss/vite)
- **Framer Motion** — page transitions, card animations
- **Recharts** — radar charts, bar charts, line charts, pie charts
- **Zustand** — global state management
- **Custom SVG icons** — no icon library dependency

## Next Steps (Firebase Integration)

To connect Firebase:

1. Install `firebase` package
2. Create a Firebase project with Auth + Firestore
3. Replace Zustand mock data with Firestore reads/writes
4. Replace the login function with `signInWithEmailAndPassword`
5. Add `onAuthStateChanged` listener for session persistence

The current architecture is designed so the store layer can be swapped to Firestore with minimal component changes.

## License

MIT
