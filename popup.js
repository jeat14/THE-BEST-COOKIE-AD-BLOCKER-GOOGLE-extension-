const btn = document.getElementById('masterSwitch');
const aggToggle = document.getElementById('aggressiveToggle');
const customInput = document.getElementById('customDomain');
const addCustomBtn = document.getElementById('addCustomBtn');
const wlBtn = document.getElementById('wlBtn');

let currentHostname = ''; 
let lastStatsHash = "";

// Whitelist elements
const whitelistInput = document.getElementById('whitelistInput');
const addWhitelistBtn = document.getElementById('addWhitelistBtn');
const wlFeedback = document.getElementById('wlFeedback');
const blockFeedback = document.getElementById('blockFeedback');

// Mascot element
const mascot = document.getElementById('mascot');

// Helper: button crunch animation
function crunchify(el) {
  el.classList.add('crunch-effect');
  el.addEventListener('animationend', () => el.classList.remove('crunch-effect'), { once: true });
}

// Helper: show inline feedback on a span element
function showFeedback(el, text, color, durationMs) {
  el.textContent = text;
  el.style.color = color;
  el.style.display = 'inline';
  clearTimeout(el._feedbackTimer);
  el._feedbackTimer = setTimeout(() => { el.style.display = 'none'; }, durationMs || 2500);
}

// Elements for Manage Filters
const manageBtn = document.getElementById('manageBtn');
const managePanel = document.getElementById('managePanel');
const customBlockList = document.getElementById('customBlockList');
const whiteListContainer = document.getElementById('whiteListContainer');

// Toggle Manage Filters panel
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
    renderManageList(customBlockList, res.customBlocklist || [], 'removeCustomBlock');
    renderManageList(whiteListContainer, res.whitelist || [], 'removeWhitelist');
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
        if (res && res.success) {
          refreshLists();
          // If we removed the currently open site from blocklist/whitelist, reload it
          if (item === currentHostname) {
            reloadActiveTab();
          }
        }
      });
    };
    
    row.appendChild(domainSpan);
    row.appendChild(delBtn);
    container.appendChild(row);
  });
}

// Initialize
chrome.storage.local.get(['enabled', 'aggressiveMode'], (res) => {
  updateToggle(res.enabled !== false);
  aggToggle.checked = res.aggressiveMode || false;
});

btn.onclick = () => {
  crunchify(btn);
  chrome.storage.local.get(['enabled'], (result) => {
    const newState = !(result.enabled !== false);
    chrome.storage.local.set({ enabled: newState }, () => {
      updateToggle(newState);
      reloadActiveTab();
    });
  });
};

aggToggle.onchange = () => {
  chrome.storage.local.set({ aggressiveMode: aggToggle.checked });
};

addCustomBtn.onclick = () => {
  crunchify(addCustomBtn);
  const domain = customInput.value.trim().toLowerCase();
  if (!domain) return;
  chrome.runtime.sendMessage({ action: 'addCustomBlock', domain }, (res) => {
    if (res === true) {
      customInput.value = "";
      showFeedback(blockFeedback, `✓ ${domain} blocked`, '#4CAF50');
      if (managePanel.style.display !== 'none') refreshLists();
    } else if (res === false) {
      showFeedback(blockFeedback, '⚠ Already in list', '#e65100');
    } else {
      showFeedback(blockFeedback, '✗ Error', '#d32f2f');
    }
  });
};

// Whitelist button handler
addWhitelistBtn.onclick = () => {
  crunchify(addWhitelistBtn);
  const domain = whitelistInput.value.trim().toLowerCase();
  if (!domain) return;

  chrome.runtime.sendMessage({ action: 'toggleWhitelist', hostname: domain }, (res) => {
    if (res) {
      const isWhitelisted = res.whitelisted;
      showFeedback(wlFeedback, isWhitelisted ? '✓ Whitelisted' : '✗ Removed', isWhitelisted ? '#4CAF50' : '#d32f2f');
      whitelistInput.value = '';
      if (domain === currentHostname) {
        updateWlBtn(isWhitelisted);
      }
      if (managePanel.style.display !== 'none') refreshLists();
    } else {
      showFeedback(wlFeedback, '✗ Error', '#d32f2f');
    }
  });
};

wlBtn.onclick = () => {
  const host = currentHostname;
  if (!host) {
    showFeedback(blockFeedback, 'Refresh page first', '#e65100');
    return;
  }
  chrome.runtime.sendMessage({ action: 'toggleWhitelist', hostname: host }, (res) => {
    if (res) {
      updateWlBtn(res.whitelisted);
      reloadActiveTab();
      if (managePanel.style.display !== 'none') refreshLists();
    }
  });
};

function reloadActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) chrome.tabs.reload(tabs[0].id);
  });
}

function updateToggle(isEnabled) {
  btn.innerText = isEnabled ? "CRUNCHING" : "SOGGY (OFF)";
  btn.className = isEnabled ? "toggle-btn" : "toggle-btn off";
}

function updateWlBtn(whitelisted) {
  if (whitelisted) {
    wlBtn.textContent = 'Blocking DISABLED — click to re-enable';
    wlBtn.className = 'wl-btn active';
  } else {
    wlBtn.textContent = 'Disable on this site';
    wlBtn.className = 'wl-btn';
  }
}

function loadStats() {
  chrome.runtime.sendMessage({ action: 'getStats' }, (stats) => {
    if (!stats) return;
    currentHostname = stats.hostname || '';
    const currentHash = `${stats.popups}-${stats.ads}-${stats.tabsKilled}-${stats.items?.length}`;
    if (currentHash === lastStatsHash) return; 
    lastStatsHash = currentHash;

    document.getElementById('hostname').textContent = currentHostname || '—';
    document.getElementById('popupCount').textContent = stats.popups || 0;
    document.getElementById('adCount').textContent = stats.ads || 0;
    document.getElementById('tabCount').textContent = stats.tabsKilled || 0;
    document.getElementById('totalCount').textContent = (stats.popups || 0) + (stats.ads || 0) + (stats.tabsKilled || 0);

    // Mascot mood update
    const totalNow = (stats.popups || 0) + (stats.ads || 0) + (stats.tabsKilled || 0);
    if (totalNow > 50) {
      mascot.textContent = '😎';
    } else if (totalNow > 10) {
      mascot.textContent = '🍪';
    } else if (totalNow > 0) {
      mascot.textContent = '😋';
    } else {
      mascot.textContent = '😴';
    }

    updateWlBtn(stats.whitelisted || false);

    const lt = stats.lifetime || {};
    document.getElementById('ltTotal').textContent = lt.totalBlocked || 0;
    document.getElementById('ltPop').textContent = lt.popups || 0;
    document.getElementById('ltAd').textContent = lt.ads || 0;
    document.getElementById('ltTab').textContent = lt.tabsKilled || 0;

    const logList = document.getElementById('logList');
    const items = (stats.items || []).slice().reverse().slice(0, 20);
    if (items.length === 0) {
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
  });
}

// --- Cereal Animation (unchanged) ---
(function startCereal() {
  const container = document.getElementById('cerealBox');
  if (!container) return;
  
  function createCereal() {
    const piece = document.createElement('span');
    piece.className = 'cereal-piece';
    piece.textContent = '🍪';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.animationDuration = (Math.random() * 2 + 3) + 's';
    piece.style.setProperty('--fall-dist', container.scrollHeight + 'px');
    container.appendChild(piece);
    setTimeout(() => piece.remove(), 5000);
  }
  
  // Adjust fall distance when popup opens
  function updateDist() {
    const dist = document.body.scrollHeight;
    document.querySelectorAll('.cereal-piece').forEach(p => {
      p.style.setProperty('--fall-dist', dist + 'px');
    });
  }
  window.addEventListener('resize', updateDist);
  
  setInterval(() => {
    if (document.hidden) return;
    createCereal();
  }, 600);
})();

// Start stats refresh
loadStats();
setInterval(loadStats, 1000);
