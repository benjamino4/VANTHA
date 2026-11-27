<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c0c701b9-ac4b-41f0-95bb-630866d937ef

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Skill icon update

Ten original skills now use Dani Melich’s transparent 32×32 pixel art. Icons appear in the hand, revealed player/opponent skill zones, draw/discard animations and graveyard. Hidden opponent cards remain hidden. All combat rules, portraits, playmat, card frames and motion remain unchanged.

The atlas is bundled locally by Vite. Attribution and original terms: `SKILL_ICON_CREDITS.txt`. The raw 30-icon pack is not redistributed.

### Build compatibility
Use Node.js 20.19+ (or 22.12+). The original package paired Vite 8 with an incompatible esbuild 0.25 peer dependency; esbuild is updated to 0.28 and the resolved dependencies are locked. Run `npm ci`, then `npm run build`. `dist/` is the ready-to-host static build; serve over HTTP(S), do not open its HTML as a local file.

### Verification
Production build and mobile browser smoke tests were run. This is an icon integration, not a gameplay or layout redesign.

Existing narrow-screen clipping and header/stat text overlap were observed in the supplied layout. Those are not redesigned by this icon-only update.
