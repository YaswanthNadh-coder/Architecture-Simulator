# 🎓 ArchSim: Interactive Multi-ISA CPU & Pipeline Visualizer

[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD627)](https://vite.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

**ArchSim** is a premium, visual, and highly interactive computer architecture simulator designed to teach and explore the inner workings of modern processors. It bridges the gap between abstract instruction sets and physical hardware execution by offering real-time cycle-by-cycle visualizations of **MIPS** and **RISC-V (RV32I)** instruction execution.

Featuring an interactive 5-stage pipeline canvas, customizable cache memory simulator, branch prediction sandbox, reverse debugging, and an institutional classroom management suite with autograding and structure-aware plagiarism detection, ArchSim is a complete classroom-ready tool for computer engineering students and instructors alike.

---

## 🚀 Key Features

### 1. ⚡ Multi-ISA Interactive Execution Engine
* **Dual Architecture Support:** Seamlessly switch between **MIPS** and **RISC-V (RV32I)** instruction sets using a clean Strategy design pattern.
* **Full Assembly Editor & Assembler:** Powered by **Monaco Editor** (the engine behind VS Code) with full syntax highlighting, instruction autocompletion, real-time syntax checking, and assembly-to-binary instruction encoding.
* **Bi-directional Execution Debugger:**
  * **Step Forward:** Advance the processor clock cycle-by-cycle.
  * **Step Backward (Reverse Debugging):** Undo cycles to investigate hazards, register overwrites, and execution steps.
  * **Play/Pause/Reset:** Run the program continuously with adjustable clock speeds.

### 2. 🎨 5-Stage Pipeline Canvas & Hazard Explainer
* **Real-time Pipeline Stages:** Visually track instructions as they transition through the classic RISC pipeline:
  1. **IF (Instruction Fetch)**
  2. **ID (Instruction Decode & Register Read)**
  3. **EX (Execute & ALU)**
  4. **MEM (Memory Access)**
  5. **WB (Write Back)**
* **Data & Control Hazard Detection:** The pipeline engine automatically flags Read-After-Write (RAW) data hazards and control hazards.
* **Interactive Bypassing (Forwarding):** Enable or disable **EX→EX** and **MEM→EX** forwarding bypasses. Watch how the pipeline automatically resolves hazards with zero stalls, highlighted dynamically on a SVG datapath canvas.
* **Stalls & Flushes:** Visualize pipeline stalls (bubble insertion) for load-use hazards and automatic pipeline flushes on branch mispredictions.

### 3. 🧠 Branch Prediction Sandbox
* **Predictor Profiles:** Experiment with different branch prediction strategies:
  * **Static Predictors:** *Always Taken* and *Always Not Taken*.
  * **Dynamic Predictors:** *1-bit Predictor*, *2-bit Bimodal Predictor*, and *Global History / Correlating Predictor*.
* **BTB & History Table:** Inspect the Branch Target Buffer (BTB) contents, global history registers, and state-machine transitions in real-time.
* **Performance Analysis:** Tracks prediction accuracy percentage, flush counts, and branch instruction overhead metrics.

### 4. 💾 Cache Memory Visualizer
* **Custom Hierarchy:** Configure L1 cache parameters:
  * **Cache Size:** 64 bytes to 4 KB.
  * **Block Size:** 4 bytes (1 word) to 64 bytes.
  * **Associativity:** *Direct Mapped*, *2-Way / 4-Way / 8-Way Set Associative*, and *Fully Associative*.
* **Replacement Algorithms:** Supports *LRU (Least Recently Used)*, *FIFO (First-In, First-Out)*, and *Random* eviction policies.
* **Live Grid View:** Interactive visualization of cache blocks (Valid bit, Tag, Data bytes) color-coded for hits, misses, and evictions.

### 5. 🏫 Classroom & Institutional Grade Suite
* **Joinable Classrooms:** Students can enroll in courses using alphanumeric codes (e.g. `CS301A`).
* **Assignment Starter Templates:** Instructors can publish assignments with starter code templates, cycle limits, and prohibited instruction lists.
* **Automated Grading Engine:** Autogrades student code against customizable test suites verifying:
  * Correctness (end register file and memory segment values).
  * Efficiency limits (execution cycle count limits and stall caps).
* **Token-based Plagiarism Detection:**
  * **Opcode LCS:** Compares structural flow sequences.
  * **Register Fingerprinting:** Catches students attempting to rename registers or variables.
  * **CFG Signature Match:** Generates a control flow graph signature to detect loop and branch rearrangement.
  * **Evasion Check:** Flags submissions trying to bypass detection using redundant instructions or NOP injection.

### 6. 📖 Guided Interactive Curriculum & Quizzes
* **10 Step-by-Step Lessons:** Features standard lessons ranging from *What is Pipelining?* and *Data Hazards* to *Data Forwarding*, *Cache Locality*, and *Capstone Loop Optimizations*.
* **Interactive Challenges:** The lessons automatically load code, run targeted cycles, highlight specific stages, and wait for students to answer integrated questions.
* **Dynamic Quiz Generator:** Auto-generates multiple-choice architecture questions to reinforce student learning.

---

## 🛠️ Architecture & Tech Stack

ArchSim is built using a modern, fast, and scalable client-first architecture.

```mermaid
graph TD
    A[Vite/React SPA Client] --> B[Zustand Store]
    B --> C[Monaco Editor Component]
    B --> D[Pipeline Canvas View]
    B --> E[Cache & Predictor Engines]
    
    A --> F[Supabase client]
    F --> G[(PostgreSQL Database)]
    F --> H[Row Level Security (RLS)]
    
    subgraph Simulation Engine
      I[MIPSPipelineEngine]
      J[ISA Strategy Pattern]
      K[AutoGrader / PlagiarismDetector]
      I --> J
    end
    B --> SimulationEngine
```

* **Frontend Framework:** React 19, TypeScript, Vite, Tailwind CSS v4.
* **State Management:** Zustand (for lightweight, reactive simulation speed and settings synchronization).
* **Visual Components:** SVG Renderers for the Datapath, Framer Motion for micro-animations, Lucide Icons.
* **Database & Auth:** Supabase (PostgreSQL, custom PL/pgSQL functions for secure auto-join codes, Row Level Security policies separating Student and Instructor roles).

---

## 📂 Project Structure

```
├── .vscode/                 # Editor configurations
├── public/                  # Static assets and favicon
├── src/
│   ├── assets/              # Icons and custom media assets
│   ├── components/          # Reusable UI components
│   │   ├── auth/            # LoginPage, RegisterPage, Protected routes
│   │   ├── dashboard/       # User course checklists & stats
│   │   ├── editor/          # Monaco Assembly Editor setup
│   │   ├── inspector/       # Registers, Memory, & Pipeline latches
│   │   ├── pipeline/        # PipelineCanvas SVG rendering
│   │   ├── pricing/         # Monetization tiers (Free, Pro, Institutional)
│   │   └── views/           # SimulatorPage, CacheView, BranchPredictionView
│   ├── engine/              # Simulation Engine core
│   │   ├── isaData.ts       # Instruction dictionary definitions
│   │   ├── isaStrategy.ts   # MIPS / RISC-V implementation strategy
│   │   ├── pipelineEngine.ts# 5-Stage simulation engine loop
│   │   ├── PlagiarismDetector.ts # Structure-aware cheating checks
│   │   ├── AutoGrader.ts    # Student assignment test suite validator
│   │   └── tutorialLessons.ts# Guided lessons configuration
│   ├── store/               # Zustand global store states
│   └── App.tsx              # React router routing and root layout
├── supabase/                # Supabase configurations and config files
└── index.html               # Main index file
```

---

## ⚙️ Setup & Installation

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.0.0 or higher)
* [NPM](https://www.npmjs.com/) (v9.0.0 or higher)

### 1. Clone & Install Dependencies
Clone the repository and run `npm install`:
```bash
git clone https://github.com/YaswanthNadh-coder/Architecture-Simulator.git
cd "Architecture Simulator"
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your-supabase-url-here
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

### 3. Run Locally
Start the development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### 4. Build for Production
To build the application for deployment:
```bash
npm run build
```

---

## 📦 Database Setup & Migrations
To set up your database in Supabase, execute the following SQL scripts in order via the Supabase SQL Editor:
1. `schema_setup.sql` — Initializes user profiles, projects, activity logs, and assignments schema.
2. `supabase_auth_migration.sql` — Handles secure database triggers for user creation.
3. `supabase_institutional_features.sql` — Sets up Course rosters, enrollment limits, assignments student views, and student submissions rules.
4. `supabase_shared_programs.sql` — Enables link-sharing capability.
5. `supabase_simulation_events.sql` — Enables detailed session activity logs.

---

> [!NOTE]
> **Instructor Role Access:** To gain instructor capabilities, modify the `role` column in the `public.profiles` table to `'instructor'` for the corresponding user ID. This enables course management, student grading dashboards, plagiarism checkers, and assignment authoring pages.

---

## 🤝 Contributing
Contributions are welcome! Please open an issue or submit a pull request if you want to add support for new instruction extensions (e.g. RISC-V Multiplication M-extension, Floating point instructions) or improve the SVG canvas layout.

---

## 📄 License
This project is licensed under the MIT License.
