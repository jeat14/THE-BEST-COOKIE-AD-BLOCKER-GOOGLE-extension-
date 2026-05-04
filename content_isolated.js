// === content_isolated.js (FULL - with Popup Shield Cookie) ===

// Inject blocker_logic.js into MAIN world
function injectBlocker() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('blocker_logic.js');
  script.onload = function() { this.remove(); };
  (document.head || document.documentElement).appendChild(script);
}
injectBlocker();

// Relay messages from MAIN world to background
window.addEventListener('message', function(event) {
  if (event.source !== window || !event.data || event.data.type !== '__crunch_block') return;
  chrome.runtime.sendMessage({
    action: 'blockEvent',
    type: event.data.blockType,
    text: event.data.text,
    hostname: location.hostname
  });
});

// Listen for CRUNCHED! effect
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'showCrunchEffect') {
    const effect = document.createElement('div');
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
  const res = await chrome.storage.local.get(['aggressiveMode', 'enabled']);
  if (!res.aggressiveMode || res.enabled === false) return;
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach(ifrm => {
    if (ifrm.width === '1' || ifrm.height === '1' || ifrm.style.width === '1px') {
      ifrm.remove();
      document.dispatchEvent(new CustomEvent('crunch-blocked', {
        detail: { type: 'ad', text: 'Invisible Iframe' }
      }));
    }
  });
}
setInterval(aggressiveScan, 3000);

// === POPUP SHIELD COOKIE ===
// Only run in top-level frame, not in iframes
if (window.top === window.self) {
  (async function popupShield() {
    const domain = location.hostname;
    const STORAGE_KEY = 'popupShieldStates';

    // Read saved state
    let shieldOn = true;
    try {
      const res = await chrome.storage.local.get(STORAGE_KEY);
      const states = res[STORAGE_KEY] || {};
      if (domain in states) {
        shieldOn = states[domain];
      }
    } catch(e) {}

    async function setShieldState(value) {
      shieldOn = value;
      try {
        const res = await chrome.storage.local.get(STORAGE_KEY);
        const states = res[STORAGE_KEY] || {};
        states[domain] = value;
        await chrome.storage.local.set({ [STORAGE_KEY]: states });
      } catch(e) {}
      updateUI();
    }

    // Create floating cookie element
    const cookieDiv = document.createElement('div');
    cookieDiv.id = '__crunch_shield_cookie';
    cookieDiv.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 48px;
      height: 48px;
      background: #8B4513;
      border-radius: 50%;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 2147483646;
      transition: transform 0.2s, background 0.3s;
      user-select: none;
    `;
    const emoji = document.createElement('span');
    emoji.style.cssText = 'font-size:28px; line-height:1;';
    cookieDiv.appendChild(emoji);
    const label = document.createElement('span');
    label.style.cssText = `
      position: absolute;
      bottom: -18px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      background: #333;
      color: #fff;
      padding: 1px 6px;
      border-radius: 6px;
      white-space: nowrap;
      font-family: Arial, sans-serif;
      pointer-events: none;
    `;
    cookieDiv.appendChild(label);

    function updateUI() {
      if (shieldOn) {
        emoji.textContent = '🛡️';
        label.textContent = 'ON';
        cookieDiv.style.background = '#4CAF50';
      } else {
        emoji.textContent = '🍪';
        label.textContent = 'OFF';
        cookieDiv.style.background = '#8B4513';
      }
    }

    cookieDiv.addEventListener('click', () => {
      setShieldState(!shieldOn);
    });

    // Wait for body to exist
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
