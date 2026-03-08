---
name: graduate-design-implementation
description: Build a UGC multi-agent debate platform for life decisions using Coze AI, NestJS workflow orchestration, React frontend, and Socket.io real-time interaction. Use when implementing features for the debate room, agent orchestration, WebSocket communication, voting systems, or when troubleshooting multi-agent coordination issues.
---

# Graduate Design: Multi-Agent Debate Platform Implementation

This skill guides development of a "Life Decisions & Moral Court" multi-agent debate platform where humans and AI agents collaboratively solve life dilemmas through structured debate.

## Core Architecture at a Glance

```
Frontend (React 18)
    ↓ WebSocket
NestJS Workflow Engine (Orchestrator & Judge)
    ↓ HTTP API
Coze Platform (3 Independent Bots + Internal Workflows)
    ↓ RAG Integration
Knowledge Bases (Psychology, Law, Game Theory)
```

**Key principle**: NestJS is the "court judge" controlling debate flow; Coze bots are independent "jurors" with specialized knowledge.

---

## Architecture Patterns

### Pattern 1: Bot Independence & RAG Integration

Each Coze Bot operates as an independent juror with specialized knowledge:

**Bot A (Blunt Realist)**

- Knowledge base: Sociology, game theory, logical fallacy detection
- Internal workflow: "Logical Fallacy Deconstruction"
  - Input: User dilemma + previous statements
  - Process: LLM node extracts hidden motives and logical gaps
  - Output: Sharp rebuttals with evidence
- Prompt strategy: Incisive, cuts through emotional noise

**Bot B (Empathetic Counselor)**

- Knowledge base: Psychology, non-violent communication
- Internal workflow: "Emotional Profile Analysis"
  - Input: User dilemma text
  - Process: LLM analyzes emotional state (anxiety, guilt, etc.), matches RAG comfort templates
  - Output: Emotionally supportive responses with psychological grounding
- Prompt strategy: Warm, validating, growth-oriented

**Bot C (Rational Lawyer)**

- Knowledge base: Civil law, labor law, contract law
- Internal workflow: "Legal Element Extraction & Verification"
  - Input: Case details
  - Process: Extract temporal, locational, financial, contractual elements; query RAG for law articles
  - Output: Objective facts and legal risk analysis only
- Prompt strategy: Neutral, evidence-based, cites specific clauses

### Pattern 2: NestJS Workflow Orchestration (Debate Flow Control)

NestJS maintains absolute control over debate progression:

**Round 1 - Opening Statements** (Parallel)

```
NestJS → [Bot A, Bot B] : "Here's the dilemma: [user content]"
         ↓        ↓
    Independent opening positions
         ↓        ↓
    NestJS collects both responses
```

**Round 2 - Cross-Examination** (Sequential)

```
NestJS → Bot B: "Bot A said: [xxx]. Your rebuttal?"
NestJS → Bot A: "Bot B said: [yyy]. Your counter?"
NestJS → Bot C: "Here's the debate so far: [history]. Legal analysis?"
```

**Round 3 - Verdict & Action Plan**

```
NestJS → Bot C: "Synthesize debate into final multidimensional action guide"
NestJS stores result in database
NestJS broadcasts completion to all viewers
```

### Pattern 3: WebSocket Room Isolation & Permission Levels

**Room Architecture**:

- Each case = one Socket.io room with unique roomId
- All viewers (owners + spectators) join the same room
- Permission model:
  - **Case Owner**: Can interrupt debate, supplement case info, request agent focus
  - **Spectators**: Can send chat, vote, react with emojis

**JWT + Socket Validation**:

```javascript
// NestJS extracts userId from JWT token at socket connection
const userId = await this.authService.validateToken(handshake.auth.token);
const caseOwnerId = await this.caseService.getOwnerId(roomId);

if (userId === caseOwnerId) {
  // Mark connection as "owner" - enable premium features
  client.data.role = "owner";
} else {
  client.data.role = "spectator";
}
```

### Pattern 4: Streaming from Coze → Frontend via WebSocket

**Challenge**: Coze returns Server-Sent Events (SSE) streams. Don't wait for full completion.

**Solution - Real-time Chunk Broadcasting**:

```javascript
// NestJS receives Coze stream
const response = await fetch(cozeApiUrl, {
  responseType: "stream",
});

response.on("data", (chunk) => {
  // Extract text from chunk
  const text = parseChunkText(chunk);

  // Immediately broadcast to room
  this.server.to(roomId).emit("stream_chunk", {
    agentId: "bot_A",
    text: text,
    timestamp: Date.now(),
  });
});
```

**React Frontend - Typewriter Effect**:

```javascript
const [messages, setMessages] = useState([]);

socket.on("stream_chunk", (data) => {
  setMessages((prev) => {
    const lastMsg = prev[prev.length - 1];
    if (lastMsg?.agentId === data.agentId) {
      // Append to existing message
      lastMsg.content += data.text;
      return [...prev];
    }
    // Start new message
    return [...prev, { agentId: data.agentId, content: data.text }];
  });
});
```

### Pattern 5: Context Memory Management via NestJS

**Challenge**: How does Bot B know what Bot A said? Coze bots are independent.

**Solution - NestJS as Memory Keeper**:

1. Maintain `RoomContext` in Redis or database:

```javascript
// After Bot A responds, store it
const context = {
  round: 1,
  botA_opening: "[Bot A's full response]",
  timestamp: Date.now(),
};
await redis.set(`room:${roomId}:context`, JSON.stringify(context));
```

2. When calling Bot B, inject context into system prompt:

```javascript
const systemPrompt = `
You are the Empathetic Counselor. 
The user's dilemma: ${userDilemma}

The Blunt Realist just said: "${botA_statement}"

Your task: Respectfully challenge their position and provide emotional grounding.
`;

await cozeClient.callBot("bot_B", {
  messages: [{ role: "system", content: systemPrompt }],
});
```

### Pattern 6: Atomic Vote Increment & Broadcasting

**Challenge**: High concurrency vote updates cause data race conditions.

**Solution - Prisma Atomic Operations + Real-time Sync**:

```javascript
// Atomic increment (prevents lost updates)
await prisma.agentStats.update({
  where: {
    roomId_agentId: {
      roomId: parseInt(roomId),
      agentId: agentId,
    },
  },
  data: { votes: { increment: 1 } },
});

// Fetch fresh stats
const stats = await prisma.agentStats.findUnique({
  where: { roomId_agentId: { roomId, agentId } },
});

// Broadcast to room
this.server.to(roomId).emit("vote_update", {
  agentId: agentId,
  votes: stats.votes,
  percentage: calculatePercentage(stats.votes),
});
```

---

## Implementation Checklist

### Phase 1: Backend Foundation

- [ ] **Authentication Module**
  - JWT token generation and validation
  - User registration with password hashing
  - Token refresh logic

- [ ] **WebSocket Gateway Setup**
  - @WebSocketGateway() with Socket.io
  - Room management (joinRoom, leaveRoom)
  - User role detection (owner vs spectator)

- [ ] **Coze Integration Service**
  - Three independent bot connectors (Bot A, B, C)
  - SSE stream parsing and handling
  - Error recovery and timeout logic

- [ ] **Workflow Orchestration Engine**
  - Debate round sequencing logic
  - Context management (Redis or in-memory)
  - Conflict resolution between agents

- [ ] **Database Initialization**
  - Prisma schema: User, Room, Message, Vote, AgentStats
  - Migrations for production readiness

### Phase 2: Real-time Features

- [ ] **Stream Broadcasting**
  - Chunk-by-chunk emission to WebSocket rooms
  - Sender identification (which agent is speaking)
  - Timestamp tracking for replay capability

- [ ] **Vote System**
  - Atomic vote increment operations
  - Vote result broadcasting
  - Permission validation (owners can override)

- [ ] **Case Context Updates**
  - Allow case owners to supplement info mid-debate
  - Broadcast updates to all viewers
  - Workflow re-evaluation if context changes

### Phase 3: Frontend UI (8 pages)

1. **Auth Page**: Login/register forms with JWT persistence
2. **Plaza (Home)**: Case card grid (Live vs Archived)
3. **Create Case**: Rich text + agent selection UI
4. **Live Debate Room**:
   - Left: Case details + evidence panel
   - Center: AI debate messages with typing indicator
   - Right: Chat + voting sidebar
   - Bottom: Vote progress bar
5. **Case Report**: Final multidimensional action guide
6. **Agent Gallery**: AI profiles, win rates, famous quotes
7. **Profile**: My cases, voting history, personality radar
8. **Admin Panel** (optional): Moderation tools

---

## Common Pitfalls & Solutions

### Pitfall 1: Assuming Coze Sessions Persist Between API Calls

**Issue**: Each HTTP call to Coze API starts a fresh bot session. The bot doesn't "remember" previous exchanges.

**Solution**: Always construct full context in the system prompt. Never rely on Coze to maintain multi-turn memory across independent API calls.

### Pitfall 2: Blocking on Full Stream Response

**Issue**: Waiting for `response.end()` before emitting to frontend causes significant latency.

**Solution**: Parse and emit every chunk as it arrives. Frontend handles assembly into coherent messages.

### Pitfall 3: Vote Race Conditions

**Issue**: Two concurrent "increment vote" requests may both read `votes: 5`, increment to `6`, and write back, resulting in `6` instead of `7`.

**Solution**: Use Prisma's `{ increment: 1 }` atomic operation, which bypasses the read-modify-write race.

### Pitfall 4: WebSocket Message Delivery Guarantee

**Issue**: High-frequency chat messages or vote updates may get queued/lost if frontend disconnects briefly.

**Solution**:

- For critical data (votes): Implement explicit ACKs with retries
- For non-critical (chat): Periodic sync from database on reconnection

### Pitfall 5: Bot Personality Collapse

**Issue**: If all three bots have identical system prompts, they'll converge toward consensus rather than creating healthy debate.

**Solution**: Deliberately craft opposing prompts. Bot A should be contrarian; Bot B should validate; Bot C should be legalistic. Make tension part of the design.

---

## Testing & Validation Checklist

Before claiming completion:

- [ ] **Integration Test**: Full debate cycle with all three bots completes without errors
- [ ] **Load Test**: 100+ concurrent viewers in one room don't crash WebSocket
- [ ] **Vote Consistency**: 1000 concurrent vote increments = exactly 1000 total votes (no race conditions)
- [ ] **Stream Quality**: Chat messages display with <500ms latency
- [ ] **Permission Enforcement**: Spectators cannot trigger case interruption endpoints
- [ ] **Graceful Degradation**: If one Coze bot fails, debate continues with remaining bots (or shows error gracefully)

---

## Debugging Commands Reference

```bash
# Watch NestJS logs for WebSocket events
tail -f logs/websocket.log | grep "emit"

# Check Redis context for a specific room
redis-cli GET "room:101:context"

# Verify Coze API connectivity
curl -X POST https://api.coze.com/v1/chat/completions \
  -H "Authorization: Bearer $COZE_API_KEY"

# Prisma query to check vote consistency
SELECT agentId, SUM(votes) FROM agent_stats WHERE roomId = 101;
```

---

## Key Files to Reference

See additional resources for detailed implementation:

- Database schema patterns: See project Prisma file
- WebSocket patterns: See NestJS documentation for Socket.io integration
- Coze bot setup: See individual bot configuration files in Coze console
- React component structure: See project frontend folder

---

## Summary

Build this platform by:

1. **Backend first**: Establish NestJS orchestration and WebSocket foundations
2. **Coze integration**: Test each bot independently, then wire them into NestJS workflow
3. **Real-time sync**: Perfect the stream parsing and room broadcasting
4. **Frontend build**: Render debate UI, then add voting and interactive features
5. **Polish**: Optimize performance, handle edge cases, prepare for presentation

The core insight: Let NestJS be the "court judge" making all flow decisions, while Coze bots focus purely on generating high-quality specialized arguments. This separation of concerns is what makes the system scalable and controllable.
