# x402 Agentic Marketplace 🤖🛍️

**Enabling AI Agents to Shop from Shopify Stores Using Movement Blockchain Payments**

[![Movement Blockchain](https://img.shields.io/badge/Movement-Blockchain-purple)](https://movementlabs.xyz)
[![App Live](https://img.shields.io/badge/App-Live-green)](https://agentic-marketplace-x402-1.onrender.com/)
[![MCP Server](https://img.shields.io/badge/MCP-Enabled-blue)](https://agentic-marketplace-x402.onrender.com/api/mcp)

## Live

Demo Video: [https://youtu.be/773SN5Sqgfw](https://youtu.be/773SN5Sqgfw)

Frontend: [https://agentic-marketplace-x402-1.onrender.com/](https://agentic-marketplace-x402-1.onrender.com/)

MCP (Claude.ai) : [https://agentic-marketplace-x402.onrender.com/api/mcp](https://agentic-marketplace-x402.onrender.com/api/mcp)

---

## 🎯 Overview

**x402 Agentic Marketplace** is a platform that allows **AI agents** (like Claude, ChatGPT, or custom agents) to **autonomously discover and purchase products** from Shopify stores, with payments settled instantly on the **Movement blockchain** using MOVE tokens.

Think of it as **"Shopify meets AI Agents meets Crypto Payments"** - bridging traditional e-commerce with the emerging world of autonomous AI agents.

---

## 🤔 Why Does This Matter?

### The Future of Shopping is Agentic

Imagine asking your AI assistant: 

> *"I need a monitor under $100"*

Instead of you spending hours searching, comparing prices, reading reviews, and checking out on multiple websites, your AI agent:
1. ✅ Searches across all connected stores
2. ✅ Compares products and prices
3. ✅ Reads and analyzes reviews
4. ✅ Finds the best match for your needs
5. ✅ Completes the purchase instantly
6. ✅ Pays with crypto (MOVE tokens)

---

## 🎬 How It Works (Simple Version)

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Shopify Store Owner Registers                     │
│  • Connects their Shopify store in 5 minutes               │
│  • Products automatically sync to marketplace              │
│  • Provides crypto wallet for receiving payments           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 2: AI Agent Discovers Products                       │
│  • Agent connects via MCP (Model Context Protocol)         │
│  • Browses products across all registered stores           │
│  • Finds exactly what user needs                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Instant Checkout with Crypto                      │
│  • Agent initiates purchase (Phase 1: 402 Payment Required)│
│  • User approves payment (MOVE tokens)                     │
│  • Agent finalizes order (Phase 2: Payment verified)       │
│  • Transaction settles on Movement blockchain              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Order Fulfillment                                 │
│  • Order automatically created in Shopify                  │
│  • Store owner sees order in their Shopify admin panel    │
│  • Standard Shopify fulfillment workflow                   │
│  • Customer receives product                               │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Technical Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    AI Agent Layer                            │
│  Claude | ChatGPT | Custom Agents | Shopping Assistants      │
└─────────────────────┬────────────────────────────────────────┘
                      │ MCP Protocol (Model Context Protocol)
                      ▼
┌──────────────────────────────────────────────────────────────┐
│              x402 Marketplace Backend (Node.js/Express)       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ MCP Server   │  │ x402 Payment │  │   Shopify    │       │
│  │ (5 tools)    │  │   Handler    │  │  Integration │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────┬────────────────────┬──────────────────┬────────────────┘
      │                    │                  │
      ▼                    ▼                  ▼
┌────────────┐    ┌──────────────┐    ┌──────────────┐
│  Supabase  │    │  Stableyard  │    │   Shopify    │
│ (Database) │    │ (x402 Facil.)│    │  Admin API   │
└────────────┘    └──────┬───────┘    └──────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  Movement    │
                  │  Blockchain  │
                  └──────────────┘
```

### Technology Stack

**Backend:**
- Express.js + TypeScript
- Supabase (PostgreSQL)
- Shopify GraphQL API (2026-01)
- x402plus library
- MCP SDK

**Frontend:**
- Next.js 15 + React 19
- TailwindCSS + Framer Motion
- shadcn/ui components
- Zustand state management

**Blockchain:**
- Movement Network
- MOVE tokens (native)
- Stableyard facilitator

---

### 🔮 Future Roadmap

- Setup feedback system for orders
- Reputation tracking for stores
- Setup rating system for products
- Suggest products based on ratings
- International shipping optimization
- Multi-language support

---

## 🎓 How to Use

**Test with Claude AI - Customer Flow (3 minutes):**

1. Open Claude AI (claude.ai)
2. Go to Settings → Connectors
3. Add Custom Connector: `https://agentic-marketplace-x402.onrender.com/api/mcp`
4. Ask Claude: "List available stores in the x402 marketplace"
5. Ask Claude: "Show me products from [store name]"
6. See AI agent browsing products autonomously!

### For Developers: Setup Local

```bash
# Clone repository
git clone https://github.com/yourusername/agentic-marketplace-x402
cd agentic-marketplace-x402

# Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run build
npm start

# Setup frontend
cd ../frontend
npm install
npm run dev
```
---