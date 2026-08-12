# **Project: Markdown-Native Discord Kanban (MNDK)**

## **1\. Project Objective & Core Philosophy**

* **Goal:** Create a Markdown-backed Kanban system that allows seamless, simultaneous collaboration between non-developer humans (via Web GUI & Discord) and Multi-AI agents (via API/Local File).  
* **Core Philosophy (Context-as-code):** The Single Source of Truth (SSOT) is strictly Markdown files (.md) with YAML Frontmatter. No external databases (SQL/NoSQL) are allowed for task state management.  
* **Inspiration:** Inherits the VS Code compatibility of Kanban Markdown and the AI-native MCP/CLI architecture of kanban-lite.

## **2\. Target Interfaces**

1. **Web Dashboard:** For non-developers (GUI drag-and-drop, served directly by the backend).  
2. **Discord Bot & CLI:** For immediate task creation/updates via slash commands, mapping directly to CLI commands.  
3. **Local IDE (VS Code/Obsidian):** Direct Markdown editing for developers. (Must maintain standard YAML frontmatter schema to support existing VS Code Kanban extensions).  
4. **AI Agents (REST API & MCP):** Real-time context parsing via REST API and Model Context Protocol (MCP) for native AI agent integration (e.g., Claude, OpenClaw).

## **3\. Tech Stack Requirements**

* **Backend:** Node.js (TypeScript), Express or Fastify, @modelcontextprotocol/sdk (for MCP).  
* **Storage / File System:** gray-matter (YAML parsing), chokidar (File watcher).  
* **Frontend:** React (Vite), TailwindCSS, dnd-kit (for Kanban drag & drop).  
* **Discord Integration:** discord.js.  
* **CLI Wrapper:** commander or yargs.  
* **Concurrency Handling:** async-mutex or proper-lockfile (CRITICAL).

## **4\. System Architecture & Data Flow**

* **Directory Structure:** All tasks reside in a specific folder (e.g., ./data/tasks/).  
* **Task Format (.md):** Must be fully compatible with standard Obsidian/VS Code Kanban frontmatter.  
  \---  
  id: "TASK-123"  
  title: "Community Member A Follow-up"  
  status: "In Progress"  
  assignee: "Morpheus"  
  dueDate: "2026-08-15"  
  \---  
  Consulting history and notes go here...

* **Synchronization Loop:**  
  1. chokidar watches ./data/tasks/.  
  2. On file change (from any source), Backend parses .md and updates the in-memory JSON state.  
  3. Backend broadcasts the updated state to Web GUI (via WebSocket/SSE) and AI Agents.

## **5\. CRITICAL ENGINEERING CONSTRAINT: Race Conditions (Concurrency)**

Since multiple actors (Web GUI, Discord Bot, AI Agent, Local Editor) can modify the exact same .md file at the same millisecond, **you MUST implement a robust File Locking/Mutex mechanism.**

* **Rule:** All file write operations must pass through a single, queued write-manager. If a file is locked, the request must retry with backoff or queue up. Data loss via overwrite is strictly prohibited.

## **6\. Phased Implementation Plan (Instructions for AI IDE)**

Execute the build in the following strict order. Do not proceed to the next phase until the current phase is fully functional and tested.

### **Phase 1: Core Engine, Storage Layer & Mutex**

* Set up TypeScript Node.js project.  
* Implement the File Manager using gray-matter to read/write Markdown files.  
* Implement chokidar to watch for file changes and update an in-memory JSON state.  
* **Crucial:** Implement the Mutex queue for file writes. Write unit tests for concurrent write attempts to prove data is not lost.

### **Phase 2: AI Interfaces (REST API, MCP, CLI)**

* Create standard REST endpoints: GET /api/tasks, POST, PUT, DELETE.  
* Implement a **Model Context Protocol (MCP)** server layer so AI agents can natively query and mutate the Kanban state.  
* Implement a CLI wrapper (e.g., npm run mndk add \--title "...") that routes through the Mutex manager.

### **Phase 3: Web GUI (Frontend)**

* Create a React Vite app in a /frontend directory.  
* Build a Kanban board using dnd-kit.  
* Connect it to the Backend: Fetch initial state via REST API, listen to updates via WebSocket, and send updates via PUT.

### **Phase 4: Discord Integration**

* Implement a discord.js bot within the backend project.  
* Add slash commands: /create-task, /update-status.  
* Ensure bot actions use the internal API or CLI wrapper (which uses the Mutex manager) to write to .md files.

## **7\. Operational Directives for AI**

* Write clean, highly modular TypeScript code.  
* Do not hallucinate APIs or libraries; stick to the approved stack.  
* Whenever writing a feature that modifies a task, implicitly route it through the file-lock queue.