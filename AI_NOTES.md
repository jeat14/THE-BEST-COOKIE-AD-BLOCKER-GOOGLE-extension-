# Cookie Crunch AI Notes
> Things I've learned while building this extension. Updated each session.

---

## Project Architecture
- **Chrome Manifest V3** extension using `declarativeNetRequest` for network blocking
- **Files**: manifest.json, rules.json, background.js, blocker_logic.js, content_isolated.js, blocker.css, popup.html, popup.js, blocked.html
- **Shadow DOM** widget floats on every page (content_isolated.js)
- **blocker_logic.js** runs in MAIN world — can override window.open, Notification, etc.
- **background.js** is a service worker — no persistent state unless using chrome.storage

## Ad Blocking Score
- **canyoublockit.com/extreme-test/**: 370/382 domains blocked (~97%)
- 11 categories covered: core ads, programmatic/RTB, analytics, social pixels, mobile SDKs, error tracking, affiliate, OEM telemetry, regional adtech, consent
- Remaining 12 unblocked were addressed with broadened rules + script bait interception

## What Works
- Network-level blocking via 200+ rules in rules.json
- CSS cosmetic filtering hides ad containers
- MutationObserver catches dynamically injected ad scripts (ads.js, pagead.js, etc.)
- window.open override blocks pop-unders
- Notification.requestPermission override blocks push spam
- KILL_LIST in background.js redirects bad tabs to blocked.html which auto-closes
- Lifetime stats persist in chrome.storage.local (survive reload/restart)
- Per-tab stats reset per page load (by design)

## What Doesn't Work / Gotchas
- **Emojis**: 🥛 💧 don't render in Chrome extension popups — only use 🍪
- **CSS in popups**: `position: fixed` and `vh` units broken — use `position: absolute` + pixel values
- **Shadow DOM**: Widget uses closed shadow root — CSS must be inline in the shadow
- **Script bait**: Same-origin scripts like `/ads.js` bypass network rules — need MutationObserver to catch and remove `<script>` tags
- **Persistent overlays**: Some scam popups (adexchangeclear.com) add backdrop divs — need aggressive DOM scanning with getComputedStyle checks
- **Service worker sleep**: Chrome can suspend the service worker — use chrome.alarms for periodic tab scanning
- **domainType: thirdParty**: Required for blocking facebook.com as third-party tracker without breaking facebook.com itself

## Domains That Needed Special Handling
- `adexchangeclear.com` / `unblocklfe.website` — persistent "Ad Block Wonder" popup on ext.to
- `www.facebook.com` — must be thirdParty only
- `analytics-sg.tiktok.com` — regional subdomain missed by base rule
- `sdkconfig.ad.intl.xiaomi.com` / `data.mistat.*.xiaomi.com` — OEM telemetry subdomains
- `bdapi-ads.realmemobile.com` — Realme mobile ad SDK

## UI Notes
- Falling cookie animation = Cookie Crisp style (all 🍪 emojis)
- Animation uses CSS @keyframes with `--fall-dist` CSS variable set by JS to match container height
- Widget panel animation starts on open, stops on close (saves resources)
- Popup animation runs continuously while popup is open
- Cereal container must be explicitly sized via JS (document.body.scrollHeight) for popup

## Rules.json Tips
- Rule IDs must be unique integers — currently ranges from 1-979
- Dynamic rules (KILL_LIST redirects) start at ID 10001+
- Use `*domain*` wildcards for broad matching
- Always include multiple resourceTypes: sub_frame, xmlhttprequest, script, image
- Script bait rules need: script, xmlhttprequest, other

## Bugs Found & Fixed
- **Backdrop overlay false positives**: The overlay killer was removing ANY full-screen semi-transparent div (even empty ones with `text.length < 5`). Normal sites like eonnext.com have tons of these (loading spinners, modals, background elements). Fix: ONLY remove overlays that contain SCAM_TEXTS. Mark checked elements with `_crunchChecked = true` to skip them on future runs. This prevents the count from inflating to hundreds of false "POPUP backdrop overlay" blocks.
- **YouTube search bar hidden by CSS**: `aside[class*="ad"]` was too broad — it matched any aside with "ad" anywhere in the class name (like "head**er**", "lo**ad**ing", "gr**ad**ient"). YouTube uses aside elements in its layout. Fix: changed to `aside[class*="ad-"]` and `aside[class*="ad_"]` which require a separator. Also added `:not([class*="ytd-"]):not([class*="yt-"])` to `.ad` class rule to exclude YouTube elements. Same for `div[role="complementary"][aria-label*="ad" i]` → changed to `aria-label*="advert"` to avoid matching "add", "loading", etc.

- **YouTube anti-adblock wall**: YouTube shows "Video player will be blocked after 3 videos" popup. Fix: CSS hides `ytd-enforcement-message-view-model` and `tp-yt-iron-overlay-backdrop`. JS `dismissYTAdblockWall()` runs on interval + MutationObserver to remove enforcement dialogs, click close buttons, remove backdrop overlays, and resume paused video. Text-matched to only target adblock warnings.

## Session Log
- **Session 1**: Built initial blocking, reached 97% on extreme test
- **Session 2**: Fixed remaining 12 domains, added script bait MutationObserver, killed adexchangeclear popup, added Cookie Crisp falling animation to popup + widget, fixed emoji rendering, improved stats persistence, fixed backdrop overlay false positives (was counting 300+ fake blocks on normal sites)
- **Session 3**: Major YouTube anti-adblock detection battle, popup blocking improvements, added nightdestruct.com and chaturbate.com blocks
- **Session 4**: Fixed click blocker blocking normal links, connected aggressiveMode toggle, fixed blocked tab auto-close, removed unused popupShieldOn

---

## YouTube Anti-Adblock Detection (CRITICAL)

YouTube has **multi-layer detection** that flags ad blockers:

### Detection Vectors:
1. **Network-level blocking** — YouTube checks if requests to `doubleclick.net`, `googlesyndication.com`, `youtube.com/pagead`, `youtube.com/get_midroll`, `youtube.com/ad_break` succeed. If blocked, triggers anti-adblock wall.
2. **CSS hiding** — YouTube uses `getComputedStyle()` to check if its ad elements (`ytp-ad-*`, `ytd-ad-slot-renderer`) are hidden. `display: none` triggers detection.
3. **JavaScript DOM probing** — Checking `player.classList.contains('ad-showing')`, querying `.ytp-ad-*` elements, calling `player.getAdState()` API — YouTube can detect these queries.
4. **Video property manipulation** — Changing `video.muted`, `video.playbackRate`, `video.volume` during ad playback is detected.
5. **Prototype hooks** — Overriding `JSON.parse`, `window.fetch`, `XMLHttpRequest` to strip ad config is detected.
6. **Session cookies** — Once flagged, YouTube stores detection state in cookies. Even with a clean extension, the wall persists until cookies cleared.

### What Works (Stealth Approach):
- **Remove ALL YouTube network rules** — use `excludedInitiatorDomains: ["youtube.com"]` on doubleclick/googlesyndication rules
- **Empty youtube.css** — no CSS hiding of any YouTube elements
- **Minimal JS only**: check `ad-showing` class (passive read), mute + speed up + click skip button
- **Clear YouTube cookies** after any detection event
- **No YouTube API calls** — don't call `player.skipAd()`, `player.getAdState()`, etc.

### Files Modified for YouTube:
- `rules.json`: Added `excludedInitiatorDomains` to rules 1, 2, 69, 70; removed YouTube-specific rules (IDs 3, 4, 66-68, 71)
- `youtube.css`: Intentionally empty (was hiding ad elements)
- `blocker_logic.js`: `handleYouTube()` simplified to just mute/speed/click-skip

---

## Popup Blocking Improvements

### The `about:blank` Bypass:
- Sites open `about:blank` popups then inject ad content or redirect
- `window.open` override was allowing `about:blank` through
- **Fix**: Block `about:blank` in window.open override

### `<a target="_blank">` Popup Bypass:
- `window.open` override doesn't catch link-based popups
- Need background service worker to catch tabs opened from known popup sources
- **Fix**: `chrome.webNavigation.onCreatedNavigationTarget` catches popups BEFORE they render

### Torrent Site Popups:
- Sites like torrentfunk, 1337x, piratebay spawn popups on click
- Added `POPUP_SOURCE_SITES` list in background.js
- Kill any `about:blank` or empty tab opened from these sources

### Affiliate Tracking Popups:
- Amazon affiliate redirects (`ref=pd_sl_*`) used by torrent sites
- Added network rule to block these redirects

---

## New Domains Added (Session 3)
- `veryfo.com` — scam popup
- `sfxly.com` — scam popup
- `ptr.broadcasting.news` — betting redirect
- `gamingamerica.com` — non-gamstop casino spam
- `adscore` — bot/proxy detection script (blocked at network level)
- `nightdestruct.com` — fake cam notification video CDN
- `chaturbate.com` — adult site popup source

---

## Session 4 Fixes

### Click Blocker Too Aggressive
- **Problem**: Click blocker was preventing ALL clicks on links containing bad domains, even normal navigation
- **Fix**: Only block popup-style clicks (`target="_blank"` + `rel="noopener/noreferrer"` or `data-role="open"`) that point to bad domains. Normal same-page navigation is allowed.

### Aggressive Mode Toggle Now Works
- **Problem**: `aggressiveMode` toggle in popup existed but did nothing
- **Fix**: Connected it to `killScamPopups()` and `killGenericAds()` — when OFF, only network-level blocking runs; when ON, deep DOM scanning for scam elements also runs

### Blocked Tab Auto-Close
- **Problem**: Blocked tabs showed "CRUNCHED!" page but didn't auto-close
- **Fix**: Simplified close logic — send `closeBlockedTab` message immediately on load, with `window.close()` fallback

### Removed Unused popupShieldOn
- **Problem**: `popupShieldOn` variable loaded from storage but never controlled by any UI
- **Fix**: Replaced with `aggressiveMode` which is controlled by the toggle in popup

---

## Key Code Patterns

### Early window.open Override:
```js
// Save real window.open BEFORE any overrides
const __realWindowOpen = window.open;
// Immediately block all popups
window.open = function() { return null; };
// Later, replace with smarter blocker that allows same-origin only
```

### Popup Source Detection (background.js):
```js
const POPUP_SOURCE_SITES = ['torrentfunk', '1337x', 'piratebay', ...];
chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
    if (details.url === 'about:blank' && details.sourceTabId) {
        chrome.tabs.get(details.sourceTabId, (opener) => {
            if (isPopupSource(opener.url)) killTab(details.tabId);
        });
    }
});
```

### Ad URL Pattern Matching:
```js
const AD_URL_PATTERNS = ['doubleclick.net', 'googlesyndication', '/lp/', 'ref=pd_sl_', 'hvcampaign'];
function isAdUrl(url) {
    return AD_URL_PATTERNS.some(p => url.toLowerCase().includes(p));
}
```


## Session 4: Popup Shield Cookie, Whitelist Input, Enhanced UI, Persistent Blocklist

### New Features
- **Popup Shield Cookie**: A floating 🍪 at the bottom‑right of every page. Green 🛡️ ON = pop‑up blocker active; brown 🍪 OFF = paused. Toggles scam pop‑up killing **per domain** without affecting network blocking or tab killing. Settings saved in `chrome.storage.local.popupShieldStates`.
- **Manual Whitelist Input** in popup: type a domain and click the green ADD button to pre‑whitelist it. Avoids accidentally opening a blocked tab for testing.
- **Enhanced Popup UI**: Milk splash background, wobbling cookie mascot (changes face based on stats), button crunch animation.
- **Auto‑close blocked page**: `blocked.html` now closes itself after 1.5 seconds. Still shows the CRUNCHED! message briefly.
- **Persistent Blocklist Requirement**: The hardcoded `KILL_LIST` in `background.js` is lost on extension update. We need to store the entire blocklist (defaults + user additions/removals) in `chrome.storage.local` and merge updates.

### Known Issue
- Hardcoded blocklist resets on code change → need migration to persistent storage.

### Next Steps
- Implement persistent blocklist storage in `background.js` (move `KILL_LIST` to `chrome.storage` with merge logic).
