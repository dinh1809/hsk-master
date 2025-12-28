# HSK Master - Chinese Vocabulary Learning App

A modern flashcard application for learning Chinese (HSK) vocabulary with spaced repetition system (SRS), shadowing mode, and personalized progress tracking.

## ✨ Features

- 📚 **HSK Vocabulary Decks** - Pre-built decks for HSK 1-2 (more coming soon)
- 🔄 **Spaced Repetition (SM-2)** - Scientifically proven algorithm for efficient learning
- 🎙️ **Shadowing Mode** - Practice pronunciation with audio recording
- 📊 **Progress Tracking** - Track your mastery with beautiful dashboards
- 🔐 **User Authentication** - Personal progress saved to cloud (Supabase)
- 🌙 **Modern UI** - Clean, responsive design with animations

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account (for authentication and data storage)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/white-viking.git
cd white-viking
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open http://localhost:5173

### Database Setup

Run the SQL migration in Supabase SQL Editor:
- `supabase_migration_auth.sql` - Creates user_progress and personal_decks tables

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite
- **Styling**: TailwindCSS 4
- **Backend**: Supabase (Auth + PostgreSQL)
- **Icons**: Lucide React
- **Audio**: Web Speech API, Web Audio API

## 📁 Project Structure

```
src/
├── components/
│   ├── AuthScreen.jsx      # Login/Signup UI
│   ├── Dashboard.jsx       # Course selection
│   ├── FlashcardSession.jsx # Main learning interface
│   └── VoiceVisualizer.jsx  # Audio waveform visualizer
├── services/
│   └── progressService.js  # Database operations
├── utils/
│   └── sm2.js              # SM-2 spaced repetition algorithm
├── data/
│   ├── HSK1.json           # HSK Level 1 vocabulary
│   └── HSK2.json           # HSK Level 2 vocabulary
└── App.jsx                 # Main app with auth routing
```

## 🎯 How It Works

1. **Learn Mode** - Study new vocabulary with pinyin, meaning, and examples
2. **Write Mode** - Practice writing Chinese characters
3. **Review Mode** - Spaced repetition sessions with rating (Easy/Good/Hard/Again)
4. **Shadowing Mode** - Listen to native pronunciation, record yourself, compare

### Progress Tracking

- Words are rated on a 0-5 scale
- SM-2 algorithm calculates next review date
- Status progression: `new` → `learning` → `reviewing` → `mastered`
- Progress bar shows percentage of mastered words

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.
