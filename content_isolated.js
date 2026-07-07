// === content_isolated.js (FULL - with Popup Shield Cookie) ===

// Guard: check if extension context is still valid before any chrome API call.
// When the extension is reloaded, existing content scripts become orphaned.
// Calling chrome APIs in an orphaned context throws "Extension context invalidated".
function isContextValid() {
  try { return !!chrome.runtime?.id; } catch(e) { return false; }
}

// Relay messages from MAIN world to background
window.addEventListener('message', function(event) {
  if (event.source !== window || !event.data) return;
  if (event.data.type === '__crunch_block') {
    chrome.runtime.sendMessage({
      action: 'blockEvent',
      type: event.data.blockType,
      text: event.data.text,
      hostname: location.hostname
    });
  } else if (event.data.type === '__crunch_action') {
    chrome.runtime.sendMessage({
      action: event.data.action,
      hostname: location.hostname
    });
  }
});

// Listen for CRUNCHED! effect
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'showCrunchEffect') {
    const effect = document.createElement('div');
    effect.id = '__crunch_effect_notification';
    effect.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      z-index: 2147483647; font-family: 'Arial Black', sans-serif;
      font-size: 40px; color: #8B4513; pointer-events: none;
      animation: crunchPop 0.6s ease-out forwards;
      text-shadow: 2px 2px 0 #Fdf5e6, 4px 4px 0 #D2B48C;
    `;
    effect.innerText = '🍪 CRUNCHED!';
    document.body.appendChild(effect);
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes crunchPop {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
        50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    setTimeout(() => { effect.remove(); style.remove(); }, 600);
  }
});

// === AGGRESSIVE MODE SCANNER (for invisible tracking iframes) ===
async function aggressiveScan() {
  if (!isContextValid()) { clearInterval(_aggressiveInterval); return; }
  try {
    const res = await chrome.storage.local.get(['aggressiveMode', 'enabled']);
    if (!res.aggressiveMode || res.enabled === false) return;
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(ifrm => {
      if (ifrm.width === '1' || ifrm.height === '1' || ifrm.style.width === '1px') {
        ifrm.remove();
        if (!isContextValid()) return;
        chrome.runtime.sendMessage({
          action: 'blockEvent',
          type: 'ad',
          text: 'Invisible Iframe',
          hostname: location.hostname
        }).catch(() => {});
      }
    });
  } catch(e) {}
}
const _aggressiveInterval = setInterval(aggressiveScan, 3000);

// === POPUP SHIELD COOKIE ===
// Only run in top-level frame, not in iframes
if (window.top === window.self) {
  (async function popupShield() {
    const domain = location.hostname;
    const STORAGE_KEY = 'popupShieldStates';

    let shieldOn = true;
    try {
      const res = await chrome.storage.local.get(STORAGE_KEY);
      const states = res[STORAGE_KEY] || {};
      if (domain in states) {
        shieldOn = states[domain];
      }
    } catch(e) {}
    try { window.postMessage({ type: '__crunch_shield', enabled: shieldOn }, '*'); } catch(e) {}

    async function setShieldState(value) {
      shieldOn = value;
      try {
        const res = await chrome.storage.local.get(STORAGE_KEY);
        const states = res[STORAGE_KEY] || {};
        states[domain] = value;
        await chrome.storage.local.set({ [STORAGE_KEY]: states });
      } catch(e) {}
      updateUI();
      try { window.postMessage({ type: '__crunch_shield', enabled: shieldOn }, '*'); } catch(e) {}
    }

    // === Inject styles ===
    const shieldStyle = document.createElement('style');
    shieldStyle.textContent = `
      #__crunch_shield_cookie {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 2147483646;
        user-select: none;
        transition: width 0.3s cubic-bezier(.4,0,.2,1),
                    border-radius 0.3s cubic-bezier(.4,0,.2,1),
                    box-shadow 0.3s ease,
                    transform 0.15s ease;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      #__crunch_shield_cookie.shield-on {
        background: linear-gradient(135deg, #00c853 0%, #1de9b6 100%);
        box-shadow: 0 0 0 3px rgba(0,200,83,0.25), 0 4px 20px rgba(0,200,83,0.4);
      }
      #__crunch_shield_cookie.shield-off {
        background: linear-gradient(135deg, #37474f 0%, #546e7a 100%);
        box-shadow: 0 0 0 3px rgba(84,110,122,0.2), 0 4px 16px rgba(0,0,0,0.35);
      }
      #__crunch_shield_cookie:hover {
        width: 110px;
        border-radius: 22px;
        transform: translateY(-2px);
      }
      #__crunch_shield_cookie.shield-on:hover {
        box-shadow: 0 0 0 4px rgba(0,200,83,0.3), 0 8px 28px rgba(0,200,83,0.45);
      }
      #__crunch_shield_cookie.shield-off:hover {
        box-shadow: 0 0 0 4px rgba(84,110,122,0.25), 0 8px 24px rgba(0,0,0,0.4);
      }
      #__crunch_shield_cookie:active {
        transform: translateY(0px) scale(0.95);
      }
      #__crunch_shield_icon {
        font-size: 20px;
        line-height: 1;
        flex-shrink: 0;
        transition: transform 0.2s ease;
        margin-left: 2px;
      }
      #__crunch_shield_cookie:hover #__crunch_shield_icon {
        transform: scale(1.1);
        margin-left: 0;
      }
      #__crunch_shield_label {
        font-size: 11px;
        font-weight: 700;
        color: #fff;
        letter-spacing: 0.5px;
        opacity: 0;
        max-width: 0;
        overflow: hidden;
        white-space: nowrap;
        transition: opacity 0.2s ease 0.05s, max-width 0.3s cubic-bezier(.4,0,.2,1);
        text-shadow: 0 1px 3px rgba(0,0,0,0.3);
        margin-left: 0;
      }
      #__crunch_shield_cookie:hover #__crunch_shield_label {
        opacity: 1;
        max-width: 80px;
        margin-left: 6px;
      }
      /* Animated glow ring */
      #__crunch_shield_cookie::after {
        content: '';
        position: absolute;
        inset: -3px;
        border-radius: 50%;
        opacity: 0;
        transition: opacity 0.3s ease, border-radius 0.3s ease;
        pointer-events: none;
      }
      #__crunch_shield_cookie.shield-on::after {
        background: radial-gradient(circle, rgba(0,230,118,0.15) 0%, transparent 70%);
        animation: __crunch_pulse 2.5s ease-in-out infinite;
        opacity: 1;
      }
      @keyframes __crunch_pulse {
        0%, 100% { transform: scale(1); opacity: 0.6; }
        50% { transform: scale(1.15); opacity: 0; }
      }
      #__crunch_shield_cookie:hover::after {
        border-radius: 22px;
        animation: none;
        opacity: 0;
      }
    `;
    (document.head || document.documentElement).appendChild(shieldStyle);

    const cookieDiv = document.createElement('div');
    cookieDiv.id = '__crunch_shield_cookie';

    const iconEl = document.createElement('span');
    iconEl.id = '__crunch_shield_icon';
    cookieDiv.appendChild(iconEl);

    const labelEl = document.createElement('span');
    labelEl.id = '__crunch_shield_label';
    cookieDiv.appendChild(labelEl);

    function updateUI() {
      if (shieldOn) {
        iconEl.textContent = '🛡️';
        labelEl.textContent = 'SHIELD ON';
        cookieDiv.classList.remove('shield-off');
        cookieDiv.classList.add('shield-on');
      } else {
        iconEl.textContent = '🚫';
        labelEl.textContent = 'SHIELD OFF';
        cookieDiv.classList.remove('shield-on');
        cookieDiv.classList.add('shield-off');
      }
    }

    cookieDiv.addEventListener('click', () => {
      setShieldState(!shieldOn);
    });

    function inject() {
      if (document.body) {
        document.body.appendChild(cookieDiv);
        updateUI();
      } else {
        requestAnimationFrame(inject);
      }
    }
    inject();
  })();
}

// === SETTINGS SYNC WITH MAIN WORLD (blocker_logic.js) ===
async function sendConfigToMainWorld() {
  try {
    const res = await chrome.storage.local.get(['enabled', 'aggressiveMode', 'whitelist']);
    window.postMessage({
      type: '__crunch_config',
      enabled: res.enabled !== false,
      aggressiveMode: res.aggressiveMode || false,
      whitelist: res.whitelist || [],
      assetsUrl: chrome.runtime.getURL('')
    }, '*');
  } catch(e) {}
}

// Initial sync
sendConfigToMainWorld();

// Listen for config requests from blocker_logic.js
window.addEventListener('message', function(event) {
  if (event.source !== window || !event.data) return;
  if (event.data.type === '__crunch_get_config') {
    sendConfigToMainWorld();
  }
});

// === SPOTIFY AD SKIPPER (ISOLATED WORLD) ===
function runSpotifySkipper() {
  if (!location.hostname.includes('spotify.com')) return;

  const _spotifyInterval = setInterval(() => {
    // Self-terminate if extension was reloaded
    if (!isContextValid()) { clearInterval(_spotifyInterval); return; }
    try {
      let isAd = false;

      // 1. Check document title for explicit ad keywords
      const docTitle = (document.title || '').trim().toLowerCase();
      if (docTitle.includes('advertisement') || docTitle.includes('sponsored') || docTitle.includes('spotify ad')) {
        isAd = true;
      }

      // 2. Check Now Playing Widget content and metadata
      const nowPlaying = document.querySelector('[data-testid="now-playing-widget"]');
      if (nowPlaying && !isAd) {
        const text = (nowPlaying.textContent || '').toLowerCase();
        if (text.includes('advertisement') || text.includes('sponsored') || text.includes('spotify ad') || text.includes('spotify free')) {
          isAd = true;
        }
        if (nowPlaying.querySelector('a[href*="/ad/"], [aria-label*="Advertisement" i], .advertisement, [data-testid="advertisement-label"]')) {
          isAd = true;
        }

        const hasTrackLinks = nowPlaying.querySelector('a[href*="/album/"], a[href*="/artist/"], a[href*="/track/"], a[data-testid="context-item-link"]');
        const hasAudioPlaying = Array.from(document.querySelectorAll('audio, video')).some(m => !m.paused && m.currentTime > 0);
        if (!hasTrackLinks && hasAudioPlaying) {
          isAd = true;
        }
      }

      // 3. Check generic document title during active playback
      if (!isAd) {
        const isGenericTitle = docTitle === 'spotify' || docTitle === 'spotify free' || docTitle.startsWith('spotify –') || docTitle.startsWith('spotify -') || docTitle === '';
        const hasAudioPlaying = Array.from(document.querySelectorAll('audio, video')).some(m => !m.paused && m.currentTime > 0);
        if (isGenericTitle && hasAudioPlaying) {
          isAd = true;
        }
      }

      // 4. Fallback: Check body texts
      if (!isAd) {
        const bodyText = (document.body ? document.body.innerText : '') || '';
        if (/advertisement|sponsored|left in the break|continue after the break/i.test(bodyText)) {
          isAd = true;
        }
      }

      // 5. Fallback: General ad label query
      if (!isAd) {
        const adLabel = document.querySelector('[aria-label*="Advertisement" i], .advertisement, .ads-container, [data-testid="advertisement-label"]');
        if (adLabel && adLabel.offsetParent !== null) {
          isAd = true;
        }
      }

      const media = document.querySelectorAll('audio, video');
      const nextBtn = document.querySelector('[data-testid="control-button-skip-forward"], button[aria-label*="Next" i], button[aria-label*="Skip Forward" i]');

      if (isAd) {
        chrome.runtime.sendMessage({ action: 'muteTab', muted: true }).catch(() => {});
        media.forEach(m => {
          try { m.muted = true; m.playbackRate = 16; } catch(e) {}
        });
        if (nextBtn && !nextBtn.disabled) {
          try {
            nextBtn.click();
            ['mousedown', 'mouseup', 'click'].forEach(type => {
              nextBtn.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
            });
          } catch(e) {}
        }
      } else {
        chrome.runtime.sendMessage({ action: 'muteTab', muted: false }).catch(() => {});
        media.forEach(m => {
          try {
            if (m.muted && m.playbackRate > 1) { m.muted = false; m.playbackRate = 1; }
          } catch(e) {}
        });
      }
    } catch(e) {}
  }, 100);
}

// Start Spotify Skipper
runSpotifySkipper();

// Watch for storage changes and update the main world dynamically
chrome.storage.onChanged.addListener((changes) => {
  if (!isContextValid()) return;
  if (changes.enabled || changes.aggressiveMode || changes.whitelist) {
    sendConfigToMainWorld();
  }
});
