---
title: FlameBurst
tier: featured
order: 2
summary: A Minecraft network I ran for five years, with custom Java plugins, server tuning and a live stats website.
role: Creator, server administrator and full-stack developer
start: Sep 2020
end: Sep 2025
stack: [Java, Paper / Purpur API, Velocity, Linux, TypeScript, Next.js]
links:
  - label: flameburst.net
    href: https://www.flameburst.net
  - label: Architecture
    href: https://www.flameburst.net/architecture
cover:
  src: ../../assets/projects/flameburst/lobby-water.webp
  alt: The FlameBurst spawn at dusk, seen across the water with lanterns lit
gallery:
  - src: ../../assets/projects/flameburst/courtyard.webp
    alt: A lantern-lit courtyard inside the spawn, under a twisted teal tree
  - src: ../../assets/projects/flameburst/blitz-arena.webp
    alt: Players fighting in the red Blitz arena, surrounded by fire
  - src: ../../assets/projects/flameburst/bounty-sunset.webp
    alt: A player with a 100,000 bounty on their head, standing on a cliff at sunset
  - src: ../../assets/projects/flameburst/weapons.webp
    alt: A set of the server's weapons laid out on black, a flaming axe, a pale staff, a scythe, a sword, a curved blade and a red trident
  - src: ../../assets/projects/flameburst/chamber.webp
    alt: An underground chamber with a red and orange checkered floor under glass, lit by glowing blocks at its corners
diagram: network
---

## What I built

FlameBurst was a survival Minecraft network that I created and ran for five years, from the
servers to the plugins to the website.

- **Ran a Linux server for 25+ concurrent players**, first on Oracle Cloud Infrastructure and then
  on a dedicated host as the load grew.
- **Tuned JVM garbage collection and thread allocation**, which cut idle memory use and removed the
  big latency spikes at peak hours.
- **Wrote custom Java plugins on the Paper and Purpur API** to automate features, strengthen
  moderation and block exploits.
- **Built a TypeScript website** with a live statistics dashboard and a CMS-driven wiki, fed directly
  by the server infrastructure.
- **Built plugin-driven systems for automated backups, player-data management and real-time
  monitoring**, so the network could recover quickly with little downtime.

## How it works

Players connect to a proxy, which routes them through a lobby to the main survival server. The
custom plugins run on the survival server and push live statistics out to the website, and a Discord
bot keeps the community up to date. The server is on hiatus now; the website stays up as it was.
