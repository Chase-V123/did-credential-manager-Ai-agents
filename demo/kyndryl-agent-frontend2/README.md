<!-- # React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js 
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
``` --> -->


This is the ReadME for the Frontend.

The step by step commands to test are here

# DID Agent System (Registry + Orchestrator + Frontend)

This project demonstrates a decentralized AI agent system with:

- Registry (stores vendors and agents)
- Orchestrator (discovers and runs agents)
- Frontend (React UI for interaction)

---

## 🚀 Setup & Run

### 1. Install Dependencies (root)

```bash
npm install


🧱 Start Services

🟦 Build Shared common Package

cd common
npm run build
cd ..

Runs on:
http://localhost:5004

🌐 Start Frontend
cd demo/kyndryl-agent-frontend/kynryl-agent-frontend2
npm run dev

Local: Open Local http in browser
e.g. http://localhost:5173/

🟩 Start Orchestrator

cd orchestrator
npm run dev

Runs on:
http://localhost:5005

Once servers are up, add test data add Test Data (PowerShell)

Caution: REGISTER VENDOR FIRST

Step (A) After Starting O
Verify the Vendors & Agent on
  http://localhost:5004/health
  http://localhost:5004/vendors
  http://localhost:5004/agents

Step (B)
🟦 Register Vendor

Copy these commands and paste directly into a new terminal on windows powershell

Invoke-RestMethod -Method POST http://localhost:5004/vendors/register `
-ContentType "application/json" `
-Body '{"vendorDid":"did:test:vendor1","vendorId":"Vendor One"}'

Step (C)
🟪 Register Agent

Invoke-RestMethod -Method POST http://localhost:5004/agents/register `
-ContentType "application/json" `
-Body '{"agentDid":"did:test:agent1","agentId":"Agent One","summary":"summarizes","callingConvention":"http","serviceEndpoint":"http://localhost:6000","vendorCredential":{"credentialSubject":{"id":"did:test:vendor1"}}}'

AFTER these are added, click on registry button to check AgentCard for updated information


FINAL STEP: Termination of Program

ctrl + c to turn off orchestrator, registry, and frontend.

Delete registry-agents.db in root/registry/data/registry-agents.db
to clear the registry data and resets the demo.

```