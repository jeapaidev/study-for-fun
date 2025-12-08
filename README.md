# 📚 Study for Fun

A simple and fun time tracking app that helps kids balance study time with play time. Study to earn leisure minutes!

> **Current Version: Study & Play (v1)** - The first release focusing on core timer and loan mechanics.

![Study for Fun](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Vite](https://img.shields.io/badge/Vite-7.x-646CFF.svg)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC.svg)

## ✨ Features

- **⏱️ Study Timer** - Track your study sessions and earn leisure time
- **🎮 Leisure Countdown** - Use your earned time for play
- **💰 Loan System** - Borrow leisure time in advance (with interest!)
- **📊 Net Balance** - See your available play time at a glance
- **📜 History** - Full audit trail of all sessions with before/after balances
- **⚙️ Configurable Settings** - Customize leisure factor, interest rate, and debt limits
- **🌍 Multi-language** - Available in English, Spanish, and French
- **💾 Local Storage** - All data persists in your browser

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/jeapaidev/study-for-fun.git

# Navigate to the app folder
cd study-for-fun/v1

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Build output will be in the `v1/dist` folder.

## 🎯 How It Works

1. **Study** - Start the study timer and focus on your work
2. **Earn** - When you stop, you earn leisure minutes based on the leisure factor (default: 0.5x)
3. **Play** - Use your earned minutes for leisure activities
4. **Loan** - Need play time now? Borrow it, but you'll need to pay back more study time later!

### Example

- Study for 60 minutes → Earn 30 minutes of leisure (at 0.5x factor)
- Borrow 10 minutes → Owe 22 minutes of study (at 10% interest)

## ⚙️ Configuration

Access Settings to customize:

| Setting        | Range     | Default | Description                                   |
| -------------- | --------- | ------- | --------------------------------------------- |
| Leisure Factor | 0.1 - 1.0 | 0.5     | Minutes of leisure earned per minute of study |
| Interest Rate  | 0% - 50%  | 10%     | Extra study time required when borrowing      |
| Debt Limit     | 0+        | 60 min  | Maximum study debt allowed (0 = unlimited)    |

## 🌍 Supported Languages

- EN English
- ES Español
- FR Français

Change language in Settings - it's saved automatically.

## 🛠️ Tech Stack

- **Build Tool**: [Vite](https://vitejs.dev/) 7.x
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) 4.x
- **Language**: Vanilla JavaScript (ES6+)
- **Storage**: Browser localStorage
- **Deployment**: Vercel-ready

## 📁 Project Structure

```
v1/
├── index.html          # App shell
├── package.json        # Dependencies
├── vite.config.js      # Vite configuration
├── src/
│   ├── main.js         # Entry point, UI logic
│   ├── timer.js        # Timer logic
│   ├── storage.js      # localStorage operations
│   ├── config.js       # Settings management
│   ├── utils.js        # Utility functions
│   ├── i18n.js         # Internationalization
│   └── style.css       # Tailwind + custom styles
└── public/             # Static assets
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set **Root Directory** to `v1`
3. Vercel auto-detects Vite and configures the build
4. Every push to `main` triggers automatic deployment

### Manual Deployment

```bash
cd v1
npm run build
# Upload contents of dist/ to your hosting provider
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## 👨‍💻 Author

Made with ❤️ for kids who want to balance study and play time.

---

**Study for Fun** · v1: _Study & Play_ - _Study smart, play hard!_ 🎮📚
