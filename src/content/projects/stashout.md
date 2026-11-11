---
title: Stashout
tier: featured
order: 1
summary: A multiplayer extraction shooter that runs in the browser, on one deterministic simulation shared by client and server.
role: Solo developer
start: Jul 2026
end: null
status: active
stack: [TypeScript, PixiJS, Node.js, uWebSockets.js, WebSockets, Vitest]
links:
  - label: Architecture tour
    href: https://github.com/theflamebeast/stashout-showcase
cover: ../../assets/placeholder.webp
---

## What I built

Stashout is a top-down extraction shooter you play in a browser tab. You drop into a raid with the
gear you choose to risk, fight other players and AI, and only keep what you carry out.

- **A server-authoritative game on a shared, deterministic simulation.** The same simulation code
  runs on the client and the server, and they talk over a custom binary protocol on WebSockets.
- **Client-side prediction, server reconciliation and lag compensation.** I validated them with my
  own tooling that simulates latency, jitter and packet loss.
- **A deployment split** between a static client build and a persistent, authoritative game server,
  with Stripe payments and per-account admin permissions.
- **A CI pipeline** that enforces strict TypeScript, runs deterministic simulation tests, and runs
  end-to-end smoke tests that drive real WebSocket clients against a live server.

## How it works

The client never waits for the server to move you. It predicts your input locally on the shared
simulation, while the server, the only authority, ticks the real game and sends snapshots back. When
a snapshot arrives, the client rewinds to it and replays the inputs the server hasn't seen yet, so
corrections land without visible snapping. Hits are judged by lag compensation, against where targets
were on the shooter's screen.
