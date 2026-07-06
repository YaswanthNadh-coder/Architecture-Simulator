# 🎓 ArchSim: Interactive Multi-ISA CPU & Pipeline Visualizer

[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD627)](https://vite.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

**ArchSim** is a premium, visual, and highly interactive computer architecture simulator designed to teach and explore the inner workings of modern processors. It bridges the gap between abstract instruction sets and physical hardware execution by offering real-time cycle-by-cycle visualizations of **MIPS** and **RISC-V (RV32I/M)** instruction execution.

> [!TIP]
> **Zero-Login MVP Deploy:** ArchSim is fully configured for a public, zero-setup deployment! All auth walls are bypassed, allowing students to access simulators, projects, and the self-grader instantly with local storage storage fallbacks.

---

## 🚀 Key Features

### 1. ⚡ Multi-ISA Interactive Execution Engine
* **Dual Architecture Support:** Switch instantly between **MIPS** and **RISC-V (RV32I/M)** instruction sets.
* **Full Assembly Editor:** Powered by **Monaco Editor** (VS Code's engine) featuring syntax highlighting, instruction autocompletion, real-time error checking, and direct binary encoding lookup.
* **Bi-directional Execution Debugger:**
  * **Step Forward:** Advance the processor clock cycle-by-cycle.
  * **Step Backward (Reverse Debugging):** Undo cycles to investigate hazards, register files, and memory changes.
  * **Continuous Play:** Adjust execution speeds from 1Hz to 100Hz.

### 2. 🎨 5-Stage Pipeline Canvas & SVG Datapath
* **Interactive 5-Stage Datapath:** Track instructions visually as they flow through the classic RISC pipeline:
  1. **IF (Instruction Fetch)**
  2. **ID (Instruction Decode & Register File Read)**
  3. **EX (Execute & ALU Operation)**
  4. **MEM (Data Memory Access)**
  5. **WB (Write Back)**
* **Stalls, Flushes, & Bubbles:** Watch how control hazards and data hazards (like load-use) dynamically inject bubbles or flush pipeline latches.
* **SVG Bypassing (Forwarding):** Toggle **EX→EX** and **MEM→EX** forwarding paths in real-time and observe the changes in forwarding lines on the interactive SVG diagram.

### 3. 🧠 Branch Prediction Sandbox
* **Predictor Configuration:** Compare performance of multiple branch prediction algorithms:
  * **Static:** *Always Taken* and *Always Not Taken*.
  * **Dynamic:** *1-Bit Predictor*, *2-Bit Bimodal Predictor* (strongly-not-taken to strongly-taken state machine), and *Global History / Correlating Predictor*.
* **BTB & History Table Inspection:** Live monitoring of Branch Target Buffer (BTB) states, history registers, and prediction hit-rate statistics.

### 4. 💾 Cache Memory Visualizer
* **Custom L1 Hierarchy:**
  * **Cache Size:** 64B to 4KB
  * **Block Size:** 4B to 64B
  * **Associativity:** *Direct Mapped*, *N-Way Set Associative*, and *Fully Associative*.
* **Eviction Policies:** Simulates *LRU (Least Recently Used)*, *FIFO (First-In, First-Out)*, and *Random* replacement schemes.
* **Live Grid Inspector:** Interactive visual matrix showing Tag, Index, Valid bit, and Dirty bit status with custom color-coded indicators for hits, misses, and block replacements.

### 5. 🏫 Classroom Self-Grader & Plagiarism Suite
* **Interactive Self-Grader:** Auto-evaluates student assembly submissions against test suites verifying:
  * **Correctness:** End-state register file values and memory segments.
  * **Efficiency:** Cycle counts, total stalls, and instruction limitations.
* **Structure-Aware Plagiarism Check:**
  * **Opcode LCS:** Detects similarities in structural code sequences.
  * **Register Fingerprinting:** Catches renaming of variables or registers.
  * **CFG Signature Matching:** Identifies control flow restructuring.
  * **NOP & Redundant Code Evasion Checks:** Detects code dilution attempts.

---

## 🛠️ Architecture & Tech Stack

**System Architecture Overview:**
* **Frontend Client (Vite / React SPA)**
  * Communicates with the **Zustand Store** for state management.
  * Connects to the **Supabase Client** (with LocalStorage fallback) for Backend Services.
* **Backend Services (Supabase)**
  * **PostgreSQL Database** for data persistence.
  * **Row Level Security (RLS)** for secure access control.
* **Core Simulator Engine** (Driven by Zustand)
  * **Simulation Engine**: Contains the `MIPSPipelineEngine` and `ISA Strategy Pattern` for dual-architecture execution.
  * **UI Components**: `Monaco Editor Component` and `Pipeline Canvas View`.
  * **Sub-Engines**: `Cache & Predictor Engines` and `AutoGrader / PlagiarismDetector`.

* **Framework:** React 19, TypeScript, Vite, Tailwind CSS
* **State Management:** Zustand (ultra-fast state updates sync'd with the requestAnimationFrame clock)
* **Visual Components:** SVG Renderers for the Datapath, Framer Motion for micro-animations, Lucide Icons
* **Database & Auth:** Supabase (with client-side local storage fallback for auth-free usage)

---

## 📂 Project Structure

```
├── public/                  # Static assets & metadata
├── src/
│   ├── components/          # UI Component tree
│   │   ├── auth/            # Auth pages & guards
│   │   ├── dashboard/       # Course checklists & setups
│   │   ├── editor/          # Monaco Assembly Editor configuration
│   │   ├── inspector/       # Register, Memory, & Pipeline latch displays
│   │   ├── pipeline/        # PipelineCanvas SVG rendering
│   │   └── views/           # Core simulator, Cache, & Predictor panels
│   ├── engine/              # Simulation core
│   │   ├── isaStrategy.ts   # MIPS / RISC-V strategy implementation
│   │   ├── pipelineEngine.ts# 5-Stage execution loop
│   │   ├── cacheSimulator.ts# Associativity, block size, & eviction policies
│   │   ├── PlagiarismDetector.ts # Cheating detection algorithms
│   │   └── AutoGrader.ts    # Automated test suite evaluator
│   ├── store/               # Zustand global store states
│   └── App.tsx              # Routing and app shell layouts
├── index.html               # Entry HTML
├── vercel.json              # Vercel configuration
└── tsconfig.json            # TypeScript configuration
```

---

## ⚙️ Setup & Installation

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.0.0 or higher)
* [NPM](https://www.npmjs.com/) (v9.0.0 or higher)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/YaswanthNadh-coder/Architecture-Simulator.git
cd "Architecture Simulator"
npm install
```

### 2. Configure Environment Variables (Optional)
If using Supabase database features, create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your-supabase-url-here
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```
*Note: If environment variables are omitted, the app automatically switches to Local Storage mode for projects, profiles, and assignments.*

### 3. Run Locally
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 📄 License
This project is licensed under the MIT License.
