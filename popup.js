// ─── Element refs ───────────────────────────────────────────────────────────
const btn           = document.getElementById('masterSwitch');
const aggToggle     = document.getElementById('aggressiveToggle');
const customInput   = document.getElementById('customDomain');
const addCustomBtn  = document.getElementById('addCustomBtn');
const wlBtn         = document.getElementById('wlBtn');
const whitelistInput  = document.getElementById('whitelistInput');
const addWhitelistBtn = document.getElementById('addWhitelistBtn');
const wlFeedback    = document.getElementById('wlFeedback');
const blockFeedback = document.getElementById('blockFeedback');
const mascot        = document.getElementById('mascot');
const manageBtn     = document.getElementById('manageBtn');
const managePanel   = document.getElementById('managePanel');
const customBlockList   = document.getElementById('customBlockList');
const whiteListContainer = document.getElementById('whiteListContainer');

let currentHostname = '';
let currentTabId    = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function crunchify(el) {
  el.classList.add('crunch-effect');
  el.addEventListener('animationend', () => el.classList.remove('crunch-effect'), { once: true });
}

function showFeedback(el, text, color, durationMs) {
  el.textContent = text;
  el.style.color = color;
  el.style.display = 'inline';
  clearTimeout(el._feedbackTimer);
  el._feedbackTimer = setTimeout(() => { el.style.display = 'none'; }, durationMs || 2500);
}

function updateToggle(isEnabled) {
  btn.innerText    = isEnabled ? 'CRUNCHING' : 'SOGGY (OFF)';
  btn.className    = isEnabled ? 'toggle-btn' : 'toggle-btn off';
}

function updateWlBtn(whitelisted) {
  wlBtn.textContent = whitelisted ? 'Blocking DISABLED — click to re-enable' : 'Disable on this site';
  wlBtn.className   = whitelisted ? 'wl-btn active' : 'wl-btn';
}

function reloadActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) chrome.tabs.reload(tabs[0].id);
  });
}

// ─── Render stats into DOM ───────────────────────────────────────────────────
function renderStats(stats, lifetime, whitelist) {
  const hostname = stats.hostname || currentHostname;
  if (hostname) {
    currentHostname = hostname;
    document.getElementById('hostname').textContent = hostname;
    const isWL = whitelist ? whitelist.some(h => hostname === h || hostname.endsWith('.' + h)) : false;
    updateWlBtn(isWL);
  }

  const total = (stats.popups || 0) + (stats.ads || 0) + (stats.tabsKilled || 0);
  document.getElementById('popupCount').textContent = stats.popups || 0;
  document.getElementById('adCount').textContent    = stats.ads || 0;
  document.getElementById('tabCount').textContent   = stats.tabsKilled || 0;
  document.getElementById('totalCount').textContent = total;

  mascot.textContent = total > 50 ? '😎' : total > 10 ? '🍪' : total > 0 ? '😋' : '😴';

  if (lifetime) {
    document.getElementById('ltTotal').textContent = lifetime.totalBlocked || 0;
    document.getElementById('ltPop').textContent   = lifetime.popups || 0;
    document.getElementById('ltAd').textContent    = lifetime.ads || 0;
    document.getElementById('ltTab').textContent   = lifetime.tabsKilled || 0;
  }

  const logList = document.getElementById('logList');
  const items = (stats.items || []).slice().reverse().slice(0, 20);
  if (!items.length) {
    logList.innerHTML = '<div class="log-empty">No blocks yet on this page</div>';
    return;
  }
  logList.innerHTML = '';
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'log-item';
    row.innerHTML = `<span class="log-tag tag-${item.type || 'ad'}">${(item.type || 'ad').toUpperCase()}</span>
                     <span class="log-text">${item.text || 'blocked'}</span>`;
    logList.appendChild(row);
  });
}

// ─── FAST INIT — reads storage only, no service worker wakeup ───────────────
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  currentTabId = tab?.id ?? null;

  // Derive hostname directly from tab URL — no background needed
  if (tab?.url) {
    try {
      currentHostname = new URL(tab.url).hostname;
      document.getElementById('hostname').textContent = currentHostname;
    } catch(e) {}
  }

  // Single batch read from local storage — instant, no SW wakeup
  chrome.storage.local.get(['enabled', 'aggressiveMode', 'lifetimeStats', 'whitelist'], (local) => {
    updateToggle(local.enabled !== false);
    aggToggle.checked = local.aggressiveMode || false;

    const whitelist = local.whitelist || [];
    if (currentHostname) {
      const isWL = whitelist.some(h => currentHostname === h || currentHostname.endsWith('.' + h));
      updateWlBtn(isWL);
    }

    // Read per-tab stats from session storage (written by background, no SW wakeup)
    const sessionKey = currentTabId ? `tab_${currentTabId}` : '__none__';
    chrome.storage.session.get([sessionKey], (session) => {
      const stats = (session && session[sessionKey]) || {};
      renderStats(stats, local.lifetimeStats, whitelist);
    });
  });
});

// ─── Master toggle ────────────────────────────────────────────────────────────
btn.onclick = () => {
  crunchify(btn);
  chrome.storage.local.get(['enabled'], (result) => {
    const newState = !(result.enabled !== false);
    chrome.storage.local.set({ enabled: newState }, () => {
      updateToggle(newState);
      // Also tell background so in-memory state updates
      chrome.runtime.sendMessage({ action: 'setEnabled', enabled: newState }).catch(() => {});
      reloadActiveTab();
    });
  });
};

// ─── Aggressive mode toggle ───────────────────────────────────────────────────
aggToggle.onchange = () => {
  chrome.storage.local.set({ aggressiveMode: aggToggle.checked });
};

// ─── Whitelist / Blocklist buttons ────────────────────────────────────────────
addCustomBtn.onclick = () => {
  crunchify(addCustomBtn);
  const domain = customInput.value.trim().toLowerCase();
  if (!domain) return;
  chrome.runtime.sendMessage({ action: 'addCustomBlock', domain }, (res) => {
    if (res === true) {
      customInput.value = '';
      showFeedback(blockFeedback, `✓ ${domain} blocked`, '#4CAF50');
      if (managePanel.style.display !== 'none') refreshLists();
      if (currentHostname && (domain === currentHostname || currentHostname.endsWith('.' + domain))) reloadActiveTab();
    } else if (res === false) {
      showFeedback(blockFeedback, '⚠ Already in list', '#e65100');
    } else {
      showFeedback(blockFeedback, '✗ Error', '#d32f2f');
    }
  });
};

addWhitelistBtn.onclick = () => {
  crunchify(addWhitelistBtn);
  const domain = whitelistInput.value.trim().toLowerCase();
  if (!domain) return;
  chrome.runtime.sendMessage({ action: 'toggleWhitelist', hostname: domain }, (res) => {
    if (res) {
      showFeedback(wlFeedback, res.whitelisted ? '✓ Whitelisted' : '✗ Removed', res.whitelisted ? '#4CAF50' : '#d32f2f');
      whitelistInput.value = '';
      if (domain === currentHostname) updateWlBtn(res.whitelisted);
      if (managePanel.style.display !== 'none') refreshLists();
    } else {
      showFeedback(wlFeedback, '✗ Error', '#d32f2f');
    }
  });
};

wlBtn.onclick = () => {
  const host = currentHostname;
  if (!host) { showFeedback(blockFeedback, 'Refresh page first', '#e65100'); return; }
  chrome.runtime.sendMessage({ action: 'toggleWhitelist', hostname: host }, (res) => {
    if (res) {
      updateWlBtn(res.whitelisted);
      reloadActiveTab();
      if (managePanel.style.display !== 'none') refreshLists();
    }
  });
};

customInput.addEventListener('keyup',   (e) => { if (e.key === 'Enter') addCustomBtn.click(); });
whitelistInput.addEventListener('keyup',(e) => { if (e.key === 'Enter') addWhitelistBtn.click(); });

// ─── Manage Filters panel ─────────────────────────────────────────────────────
manageBtn.onclick = () => {
  crunchify(manageBtn);
  if (managePanel.style.display === 'none') {
    managePanel.style.display = 'block';
    refreshLists();
  } else {
    managePanel.style.display = 'none';
  }
};

function refreshLists() {
  chrome.runtime.sendMessage({ action: 'getLists' }, (res) => {
    if (!res) return;
    renderManageList(customBlockList,    res.customBlocklist || [], 'removeCustomBlock');
    renderManageList(whiteListContainer, res.whitelist       || [], 'removeWhitelist');
  });
}

function renderManageList(container, items, actionName) {
  if (items.length === 0) {
    container.innerHTML = '<div class="manage-empty">No items in this list</div>';
    return;
  }
  container.innerHTML = '';
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'manage-item';
    const domainSpan = document.createElement('span');
    domainSpan.className = 'manage-domain';
    domainSpan.textContent = item;
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-item-btn';
    delBtn.innerHTML = '🗑️';
    delBtn.title = 'Remove';
    delBtn.onclick = () => {
      crunchify(delBtn);
      chrome.runtime.sendMessage({ action: actionName, domain: item }, (res) => {
        if (res?.success) {
          refreshLists();
          if (item === currentHostname) reloadActiveTab();
        }
      });
    };
    row.appendChild(domainSpan);
    row.appendChild(delBtn);
    container.appendChild(row);
  });
}

// ─── Cereal animation — deferred so it doesn't block first paint ──────────────
setTimeout(() => {
  const container = document.getElementById('cerealBox');
  if (!container) return;

  function createCereal() {
    const piece = document.createElement('span');
    piece.className = 'cereal-piece';
    piece.textContent = '🍪';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.animationDuration = (Math.random() * 2 + 3) + 's';
    piece.style.setProperty('--fall-dist', document.body.scrollHeight + 'px');
    container.appendChild(piece);
    setTimeout(() => piece.remove(), 5000);
  }

  setInterval(() => {
    if (!document.hidden) createCereal();
  }, 600);
}, 300); // defer 300ms — popup is already visible and interactive by then
