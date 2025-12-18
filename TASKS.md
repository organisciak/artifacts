# Maintenance Log & Next Steps

## Completed in this round
- ✅ `src/hooks/useImageExport.ts`: Fixed the "Explort" typo and restored the newline so the comment no longer reads strangely.
- ✅ `src/components/games/fish-game.tsx`: Corrected the fullscreen resume handler so playing from fullscreen truly dismisses the overlay.
- ✅ `src/game/entities/PlayerFish.ts`: Rewrote the header documentation to mirror the actual properties and methods on `PlayerFish`.
- ✅ `src/game/GameManager.ts`: Added regression coverage around `getCurrentSpawnInterval` to lock in the spawn balancing maths.

## Next ideas to explore
- 🎵 Compose a subtle Web Audio soundscape for Celestial Slide so completing streaks produce satisfying harmonic cues.
- 🧭 Add shareable challenge seeds that recreate an identical Celestial Slide shuffle for friendly competitions.
- 📊 Surface lightweight analytics for Fish Game spawn pacing to confirm the new tests reflect real gameplay distribution.
