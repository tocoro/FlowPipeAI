# CLAUDE.md - FlowPipe AI

## Project Overview

FlowPipe AI is a visual data processing web application inspired by Unix pipes. It allows users to create data processing workflows using a node-and-edge graph editor, with AI-powered flow generation via Google Gemini.

**Key Features:**
- Visual flow editor with real-time execution feedback
- AI-powered flow generation from natural language prompts
- Multiple node types for data processing (Input, Emitter, Process, Branch, Merge, Batch, Sequence, Output)
- Live data stream simulation
- Interactive inspector for debugging data at each pipeline stage

## Tech Stack

- **React 19** - UI framework
- **ReactFlow 11** - Node-based graph editor
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling (CDN)
- **Google Generative AI** - Gemini API for AI flow generation
- **Lucide React** - Icon library

## Directory Structure

```
FlowPipeAI/
├── App.tsx                 # Main component - flow canvas, layout, interaction logic
├── index.tsx               # React entry point
├── index.html              # HTML template with CDN imports
├── types.ts                # TypeScript type definitions and enums
├── constants.ts            # Initial demo flow configuration
├── components/
│   └── Inspector.tsx       # Draggable data inspector panel
├── services/
│   └── geminiService.ts    # Google Gemini API integration
└── utils/
    └── flowEngine.ts       # Data flow execution engine (topological sort)
```

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run preview      # Preview production build
```

## Environment Setup

Create a `.env.local` file with:
```
GEMINI_API_KEY=your_api_key_here
```

## Architecture

### Node Types (enum `NodeType`)

| Type | Description |
|------|-------------|
| `INPUT` | Static text source |
| `EMITTER` | Real-time data stream generator |
| `PROCESS` | Text transformation operations |
| `BRANCH` | Conditional routing |
| `MERGE` | Fan-in aggregation |
| `BATCH` | Windowing/grouping |
| `SEQUENCE` | Stateful sequence pattern matching |
| `OUTPUT` | Pipeline endpoint |

### Process Types (enum `ProcessType`)

`split`, `grep`, `sed`, `awk`, `sort`, `uniq`, `join`, `wc`, `upper`, `lower`

### Flow Execution Engine

Located in `utils/flowEngine.ts`:
- Uses Kahn's topological sort for DAG execution
- Maintains state for stateful nodes (e.g., SEQUENCE)
- Implements fan-in logic to merge multiple inputs
- Debounced execution (100ms) triggered by node/edge changes

### AI Integration

Located in `services/geminiService.ts`:
- Model: `gemini-3-flash-preview`
- Uses structured output with JSON Schema validation
- Translates natural language prompts into valid node/edge graphs

## Code Conventions

### Naming

- **PascalCase** - React components (`App`, `Inspector`)
- **camelCase** - Functions and variables
- **UPPERCASE_SNAKE_CASE** - Constants and enums
- **on*/handle*** - Event handlers (`onClick`, `handleNodeClick`)

### React Patterns

- Functional components with hooks
- Props destructuring in function parameters
- Type annotations on all props and state
- useState for component-level state (no global state library)
- useCallback for memoized callbacks
- useEffect for side effects and flow execution

### TypeScript

- Full type coverage on functions and state
- Union types for multiple possible values
- Type guards for node type checking
- Import types from `types.ts`

### Error Handling

- Try-catch in AI service integration
- Regex operations wrapped in try-catch
- Default fallback values for invalid inputs

## Key Interfaces

```typescript
interface NodeData {
  label: string
  type: NodeType
  processType?: ProcessType
  params?: {
    pattern?: string
    replacement?: string
    delimiter?: string
    fieldIndex?: number
    batchSize?: number
  }
  isActive?: boolean
  currentValue?: any
  isResult?: boolean
}

interface FlowExecutionResult {
  nodeResults: Record<string, any>  // Node ID → output data
  edgeResults: Record<string, any>  // Edge ID → flowing data
}
```

## Important Files

| File | Purpose |
|------|---------|
| `App.tsx` | Main UI with flow canvas, node editor, execution loop |
| `utils/flowEngine.ts` | Topological sort DAG execution with processors |
| `services/geminiService.ts` | Gemini API with JSON schema validation |
| `components/Inspector.tsx` | Draggable data viewer for nodes/edges |
| `types.ts` | Type definitions and enums |
| `constants.ts` | Demo "Monkey Typer" sequence flow |

## Working with This Codebase

### Adding a New Process Type

1. Add the type to `ProcessType` enum in `types.ts`
2. Implement the processing logic in `processData()` function in `utils/flowEngine.ts`
3. Update the AI prompt in `geminiService.ts` if needed

### Adding a New Node Type

1. Add the type to `NodeType` enum in `types.ts`
2. Handle the node type in `executeFlowDFS()` in `utils/flowEngine.ts`
3. Add styling in `App.tsx` node rendering
4. Update the AI prompt in `geminiService.ts`

### Modifying AI Flow Generation

Edit the system prompt in `services/geminiService.ts` to adjust how the AI interprets natural language and generates flows.

## Testing

No formal testing framework is currently configured. Key areas for future testing:
- Flow execution engine logic
- Topological sort correctness
- AI response parsing
- React component interactions

## Path Aliases

The project uses `@/*` as a path alias to the root directory:
```typescript
import { NodeType } from '@/types'
```

## Notes for AI Assistants

- The main state is managed in `App.tsx` using React hooks
- Flow execution is triggered automatically when nodes/edges change
- Emitter nodes generate data every 150ms when active
- The Inspector component is draggable and shows data for selected nodes/edges
- ReactFlow and Tailwind CSS are loaded from CDN, not bundled
