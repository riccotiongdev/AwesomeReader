# 📖 AwesomeReader

**AwesomeReader** is a modern, fast, and reader-centric RSS Feed Reader application designed for Web, PWA, and Mobile (Android & iOS). Built with Next.js, React, TypeScript, Dexie.js (IndexedDB), and Capacitor v6, it provides an offline-first, distraction-free reading experience inspired by Apple Books and iOS Human Interface Guidelines.

---

## ✨ Features

- 📖 **Reader-Centric Typography & Themes**:
  - **OLED Dark Mode**: Deep black background optimized for OLED displays.
  - **Sepia Paper Mode**: Warm, low-contrast theme designed for comfortable long-form reading.
  - **Light Mode**: Crisp, high-contrast day reading mode.

- 🧭 **Universal RSS Discovery Engine**:
  - Live search across millions of RSS feeds, blogs, news outlets, and podcasts.
  - Topic category chips for instant exploration (Technology, World News, Finance, Gaming, Science, etc.).

- 👁️ **5-Article Live Feed Preview**:
  - Preview the top 5 latest articles of any RSS feed before subscribing.
  - Subscribe with 1 tap directly from the preview modal.

- 🌐 **Paywall Bypass & Full Text Extraction**:
  - Built-in **🌐 Web Archive Today** button (`archive.ph`) for paywalled articles.
  - Intelligent JSON-LD structured data and Readability parsing for extracting full article bodies.

- 📂 **Folders & Drag and Drop Organization**:
  - Group RSS feeds into custom collapsible folders.
  - Drag-and-drop feeds to organize them into folders.
  - 3-dots management popovers to move or delete feeds and folders.

- 📥 **OPML Import & Export**:
  - Seamlessly import and export your existing RSS subscriptions in standard `.opml` format.

- 📱 **Foldable Phone & Mobile Optimized**:
  - Responsive layouts tailored for foldable outer screens (e.g. 1060 × 2376 px) and mobile displays.
  - Android Hardware Back Button navigation support.

- ⚡ **Offline-First Architecture**:
  - Powered by Dexie.js (IndexedDB) for local data persistence and instant loading.

---

## 🛠️ Technology Stack

- **Framework**: Next.js & Vite with React 18 and TypeScript
- **Styling**: Modern Vanilla CSS with CSS Custom Properties
- **Local Database**: Dexie.js (IndexedDB)
- **Feed Parser**: `fast-xml-parser` with entity protection
- **Native Platform**: Capacitor v6 (Android / iOS)

---

## 🚀 Getting Started

### Prerequisites

- Node.js `v20.x` or higher
- npm `v10.x` or higher
- Android Studio / JDK 17+ (for building native Android APKs)

### Installation & Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/riccotiongdev/AwesomeReader.git
   cd AwesomeReader
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. **Build web production bundle**:
   ```bash
   npm run build
   ```

---

## 📲 Building Native Android App

1. **Sync Capacitor web assets**:
   ```bash
   npx cap sync
   ```

2. **Compile Android Debug APK**:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```

The compiled APK will be located at:
`AwesomeReader.apk` (or `android/app/build/outputs/apk/debug/app-debug.apk`)

---

## 📄 License

MIT License.
