

## Fix Gift Animation Mapping

### Problem
The 15 gift animations (excluding Dragon, Lamborghini, Private Jet, Royal Yacht which are correct) have wrong videos assigned. The user has provided the exact WhatsApp filename → gift mapping.

**Note:** Pegasus and Crystal Castle both map to the same file (`WhatsApp Video 2026-03-20 at 4.23.14 PM (1).mp4`), so they will share the same animation.

### What needs to happen

**Step 1: Upload the WhatsApp videos to `public/gifts/videos/` with clean names**

The WhatsApp videos need to be re-uploaded. I will rename each to its correct gift name as it's placed:

| WhatsApp File | → Renamed To | Gift |
|---|---|---|
| WhatsApp Video 2026-03-20 at 4.23.14 PM (1).mp4 | castle.mp4 | Crystal Castle |
| WhatsApp Video 2026-03-20 at 4.23.14 PM.mp4 | spacerocket.mp4 | Space Rocket |
| WhatsApp Video 2026-03-20 at 4.23.15 PM.mp4 | goldenrose.mp4 | Golden Rose |
| WhatsApp Video 2026-03-20 at 4.23.20 PM (1).mp4 | diamond.mp4 | Diamond |
| WhatsApp Video 2026-03-20 at 4.23.20 PM (2).mp4 | supercar.mp4 | Exotic Supercar |
| WhatsApp Video 2026-03-20 at 4.23.20 PM.mp4 | watch.mp4 | Luxury Watch |
| WhatsApp Video 2026-03-20 at 4.23.32 PM (1).mp4 | throne.mp4 | Golden Throne |
| WhatsApp Video 2026-03-20 at 4.23.32 PM.mp4 | treasure.mp4 | Treasure Chest |
| WhatsApp Video 2026-03-19 at 10.51.49 PM.mp4 | glamour.mp4 | Glamour Party |
| WhatsApp Video 2026-03-19 at 10.51.46 PM.mp4 | royalcrown.mp4 | Royal Crown |
| WhatsApp Video 2026-03-19 at 10.51.47 PM (1).mp4 | heartgold.mp4 | Heart of Gold |
| WhatsApp Video 2026-03-19 at 10.51.47 PM (2).mp4 | robot.mp4 | Robotic Butler |
| WhatsApp Video 2026-03-20 at 4.23.14 PM (1).mp4 | pegasus.mp4 | Mythic Pegasus (same as Castle) |
| WhatsApp Video 2026-03-20 at 4.23.19 PM.mp4 | handbag.mp4 | Luxury Handbag |

**Missing:** Lion — no WhatsApp video provided. Will keep current `lion.mp4`.

**Step 2: Update `src/data/giftData.ts`**
- Bump version string to `20260323-fix-4` to bust browser cache
- Code paths stay the same (castle.mp4, spacerocket.mp4, etc.) — only the actual file content changes

**Step 3: No other files touched**
- No UI changes
- No style changes  
- Dragon, Lamborghini, Private Jet, Royal Yacht stay exactly as they are

### Important Note
You need to **re-upload all 14 WhatsApp videos** so I can place them with the correct names. Please upload them in your next message and I will map each one exactly per your list above.

