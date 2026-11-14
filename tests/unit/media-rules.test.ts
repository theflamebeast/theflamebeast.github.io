import { describe, expect, it } from 'vitest';
import { isForbiddenSource } from '../../scripts/media-rules.mjs';

describe('isForbiddenSource', () => {
  it.each([
    ['X:/media/FlameBurst/Cinematic/Whisk/Whisk_6d542f919a.png'],
    ['X:/media/FlameBurst/Whisk/key (1).jpg'],
    ['X:/media/FlameBurst/Models/Icon/2 (Gemini 3 Pro Nano Banana)/OG/x.png'],
    ['X:/media/FlameBurst/Technical/Screenshot 2023-06-25 153132.png'],
    ['X:\\media\\FlameBurst\\Technical\\flameburst deleted dns.png'],
    ['X:/game/ui-shots/admin-1.png'],
    ['X:/game/ui-shots/auth.png'],
    ['X:/game/ui-shots/admin-panel.jpg'],
    ['X:/game/ui-shots/ADMIN-2.webp'],
    ['X:/game/ui-shots/auth.jpeg'],
    ['X:/game/ui-shots/Auth.WEBP'],
  ])('refuses %s', (p) => {
    expect(isForbiddenSource(p)).toEqual(expect.any(String));
  });

  it.each([
    ['X:/media/FlameBurst/Cinematic/bg (30).png'],
    ['X:/media/FlameBurst/Cinematic/Blitz (2).png'],
    ['X:/game/ui-shots/lobby.png'],
    ['X:/game/ui-shots/administrator-notes.png'],
    ['X:/media/TechnicalArt/bg.png'],
    ['X:/game/ui-shots/author.png'],
    ['X:/game/ui-shots/auth-flow-diagram.png'],
  ])('allows %s', (p) => {
    expect(isForbiddenSource(p)).toBeNull();
  });
});
