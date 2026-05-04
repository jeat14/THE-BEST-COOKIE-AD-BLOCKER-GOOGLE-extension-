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

// Mascot element
const mascot = document.getElementById('mascot');

// Helper: button crunch animation
function crunchify(el) {
  el.classList.add('crunch-effect');
  el.addEventListener('animationend', () => el.classList.remove('crunch-effect'), { once: true });
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
    if (res) {
      customInput.value = "";
      alert(`Added ${domain} to the crunch list!`);
    } else {
      alert("Error adding domain.");
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
      // Show feedback
      wlFeedback.style.display = 'inline';
      wlFeedback.textContent = isWhitelisted ? '✓ Whitelisted' : '✗ Removed';
      wlFeedback.style.color = isWhitelisted ? '#4CAF50' : '#d32f2f';
      setTimeout(() => { wlFeedback.style.display = 'none'; }, 2500);

      whitelistInput.value = '';

      // If it matches current tab, update the main disable button
      if (domain === currentHostname) {
        updateWlBtn(isWhitelisted);
      }

      alert(`${isWhitelisted ? 'Whitelisted' : 'Removed from whitelist'}: ${domain}`);
    } else {
      alert('Error whitelisting domain.');
    }
  });
};

wlBtn.onclick = () => {
  chrome.runtime.sendMessage({ action: 'getStats' }, (stats) => {
    const host = stats?.hostname || currentHostname;
    if (!host) {
      alert("Could not detect site hostname. Please try refreshing the page and opening the popup again.");
      return;
    }
    chrome.runtime.sendMessage({ action: 'toggleWhitelist', hostname: host }, (res) => {
      if (res) {
        updateWlBtn(res.whitelisted);
        reloadActiveTab();
      }
    });
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
