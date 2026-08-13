<div align="center">
  <img src="./ThearKANBAN_banner.gif" alt="ThearKANBAN Workflow Animation" width="850"/>

  # TheARKanban (MNDK)
  **Markdown-Native Discord Kanban**

  <p align="center">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Discord.js-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord">
    <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js">
    <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React">
  </p>

  <p><em>Seamless collaboration between Human and Multi-AI agents via Context-as-code</em></p>
</div>

---

## 🚀 Quick Start (For Non-Developers / Easy Install)

This repository deliberately includes pre-built binaries (`dist/` and `frontend/dist/`). 
**Why?** To support zero-hassle deployments on older legacy systems (e.g., older macOS or low-spec servers) where modern build tools like `esbuild` cannot run. 

You do **not** need to build anything. Just pull and run!

### 1. Prerequisites
- **Node.js** installed on your system.
- Create a `.env` file in the root folder with your Discord Bot Token:
  ```env
  DISCORD_TOKEN=your_discord_bot_token_here
  DISCORD_CLIENT_ID=your_discord_client_id_here
  DISCORD_CHANNEL_ID=your_discord_channel_id_here
  ```

### 2. Installation & Run
Run these commands in your terminal:
```bash
# 1. Download the code (including pre-built production files)
git clone https://github.com/dev-whitecrow/TheARKanban.git
cd TheARKanban

# 2. Install ONLY essential production dependencies (bypasses build tool errors)
npm install --omit=dev --ignore-scripts

# 3. Start the server!
npm start
```
That's it! Your server is now running at `http://localhost:3000`.

*(Optional)* If you want to keep the server running 24/7 in the background, use PM2:
```bash
npm install -g pm2
pm2 start dist/index.js --name "arkanban"
pm2 save
```

---

## 💻 For Developers (Building from Source)

If you want to modify the code, you can run the development servers and build it yourself.

```bash
# Install all dependencies
npm install

# Run Backend and Frontend concurrently in Dev Mode
npm run dev

# Build for Production (Compiles and updates dist/ and frontend/dist/)
npm run build
```

---

## 🧠 Project Objective & Core Philosophy

- **Goal:** Create a Markdown-backed Kanban system that allows seamless, simultaneous collaboration between non-developer humans (via Web GUI & Discord) and Multi-AI agents (via API/Local File).
- **Core Philosophy (Context-as-code):** The Single Source of Truth (SSOT) is strictly Markdown files (`.md`) with YAML Frontmatter. No external databases (SQL/NoSQL) are allowed for task state management.

## 🎯 Target Interfaces
1. **Web Dashboard:** For non-developers (GUI drag-and-drop, served directly by the backend).
2. **Discord Bot:** Immediate task creation/updates via slash commands (`/story`, `/board`).
3. **Local IDE (VS Code / Obsidian):** Direct Markdown editing for developers. 
4. **AI Agents:** Real-time context parsing via REST API and Model Context Protocol (MCP) for native AI agent integration (e.g., Claude, Cursor).
---

## 🏗️ Technical Details & Architecture

### Tech Stack
- **Backend:** Node.js (TypeScript), Express, `@modelcontextprotocol/sdk` (for MCP).
- **Storage / File System:** `gray-matter` (YAML parsing), `chokidar` (File watcher).
- **Frontend:** React (Vite), TailwindCSS, `dnd-kit` (for Kanban drag & drop).
- **Discord Integration:** `discord.js`.
- **Concurrency Handling:** Built-in Write Queue for robust local file locking.

### System Architecture & Data Flow

**Directory Structure:** All tasks reside in a specific folder (e.g., `./data/tasks/`).

**Task Format (`.md`):** Must be fully compatible with standard Obsidian/VS Code Kanban frontmatter.
```yaml
---
id: "STORY-123"
title: "Community Member A Follow-up"
status: "in-progress"
assignee: "Morpheus"
epic: "Onboarding"
---
Consulting history and notes go here...
```
