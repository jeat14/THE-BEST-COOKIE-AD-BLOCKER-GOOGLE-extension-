// === PERSISTENT BLOCKLIST (never forgets URLs after code changes) ===
const DEFAULT_KILL_LIST = [
    "wo0f-woof.com", "opera.com", "1775995", "popsmartblocker.pro",
    "plusultraadblocker.net", "lzew-defender.pro", "continue2download.com",
    "profferstrack.com", "nonegamstopbets.co.uk", "life-iron.com",
    "1adr.com", "heroadblocker.pro", "nonstopbetting.br.com", "crcdn.org",
    "snammar-jumntal.com", "azulcw7.com", "waggelvet.qpon", "yourdatingoasis.com",
    "whitebit.com", "herta.co.uk", "ourdream.ai", "ourdreamai.com",
    "addefenderplus.com", "adexchangeclear.com", "njunyihalsdvb.site",
    "digital.acrpoker.eu", "hirehack.online", "platformance.io",
    "frenk.io", "ascendio.group", "velobet.com", "amazon.co.uk/gp/video/offers",
    "wneerbgaguvzp.online", "ultraplusadblocker.info", "uk.trip.com",
    "trendflare.live", "unibet.co.uk", "orchestrabruisereason.com",
    "dysenteryanywhere.com", "go2me.fun", "tempobeat.ai", "shein.co.uk",
    "073m.com", "skin-crown.com", "arcanepantry.com", "sitesnogamstop.uk",
    "betportal63214.com", "bitpanda.com", "gbcasino.ink", "nogamestopsite.uk",
    "livejasmin.com", "coolland.xyz", "discussioncomperesteel.com",
    "travelerbird.com", "routescdn.net", "tracking.wpnetwork.eu",
    "bodyaxis.club", "s.click.aliexpress.com", "extension-offer.com",
    "flassix.com", "thehookupcapecod.com", "luckytopclubhouse.com",
    "unblocklfe.website", "adexchangeclear.com",
    "gamerdenz.com", "gamerhit.co", "skinstrikes.com",
    "veryfo.com", "sfxly.com", "ptr.broadcasting.news", "gamingamerica.com",
    "nightdestruct.com", "chaturbate.com"
];

let KILL_LIST = [];                // active list from storage
let customBlocklist = [];
let whitelist = [];
let isEnabled = true;

const DYNAMIC_RULE_START = 100000;
let lastBlockedHostname = '';

// Load everything from storage, merge with defaults, then build rules
chrome.storage.local.get([
    'enabled', 'whitelist', 'customBlocklist',
    'killList', 'removedFromKillList'
], (res) => {
    if (res.enabled === false) isEnabled = false;
    whitelist = res.whitelist || [];
    customBlocklist = res.customBlocklist || [];

    const storedKill = res.killList || [];
    const removed = res.removedFromKillList || [];

    // Merge defaults + stored additions, then filter out removed domains
    const merged = [...new Set([...DEFAULT_KILL_LIST, ...storedKill])];
    KILL_LIST = merged.filter(domain => !removed.includes(domain));

    // Save back the merged list (so new defaults from updates are persisted)
    chrome.storage.local.set({ killList: merged, removedFromKillList: removed });

    setupRedirectRules();
});

// --- tab stats ---
const tabStats = {};
function getStats(tabId) {
    if (!tabStats[tabId]) tabStats[tabId] = { hostname: '', popups: 0, ads: 0, tabsKilled: 0, items: [] };
    return tabStats[tabId];
}
chrome.tabs.onRemoved.addListener((tabId) => { delete tabStats[tabId]; });

let lifetimeStats = { totalBlocked: 0, popups: 0, ads: 0, tabsKilled: 0 };
chrome.storage.local.get(['lifetimeStats'], (res) => {
    if (res.lifetimeStats) lifetimeStats = { ...lifetimeStats, ...res.lifetimeStats };
});

function bumpLifetime(type) {
    lifetimeStats.totalBlocked++;
    if (type === 'popup') lifetimeStats.popups++;
    else if (type === 'ad' || type === 'click') lifetimeStats.ads++;
    else if (type === 'tab') lifetimeStats.tabsKilled++;
    chrome.storage.local.set({ lifetimeStats });
}

function isWhitelisted(hostname) {
    if (!hostname) return false;
    return whitelist.some(h => hostname === h || hostname.endsWith('.' + h));
}

function isBadUrl(url) {
    if (!url) return false;
    const lower = url.toLowerCase();
    try {
        const hostname = new URL(url).hostname;
        if (isWhitelisted(hostname)) return false;
    } catch (e) {}
    const allBad = [...KILL_LIST, ...customBlocklist];
    return allBad.some(d => lower.includes(d.toLowerCase()));
}

function setupRedirectRules() {
    // Clear dynamic rules (IDs 1000+) to remove any cached redirect rules
    // Static rules from rules.json (IDs 1-999) are preserved
    const dynamicIds = Array.from({ length: 100000 }, (_, i) => i + 1000);
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: dynamicIds
    }, () => {
        if (chrome.runtime.lastError) {
            console.log("Cookie Crunch: Error clearing rules:", chrome.runtime.lastError);
        } else {
            console.log("Cookie Crunch: Cleared all dynamic rules");
        }
    });
    
    // Close any existing blocked.html tabs on startup
    chrome.tabs.query({ url: chrome.runtime.getURL('blocked.html') }, (tabs) => {
        if (tabs && tabs.length > 0) {
            tabs.forEach(t => chrome.tabs.remove(t.id));
        }
    });
}

// --- Hostname capture & immediate kill ---
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (!isEnabled) return;
    
    // Close tabs navigating to blocked.html (shouldn't happen but safety check)
    if (details.url && details.url.includes('blocked.html')) {
        chrome.tabs.remove(details.tabId);
        return;
    }
    
    if (details.frameId === 0 && isBadUrl(details.url)) {
        try {
            lastBlockedHostname = new URL(details.url).hostname;
        } catch (e) {}
        // Kill the tab immediately - don't wait for redirect
        chrome.tabs.remove(details.tabId);
        bumpLifetime('tab');
    }
});

// --- Message handlers ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'closeBlockedTab') {
        // Always close all blocked.html tabs
        chrome.tabs.query({ url: chrome.runtime.getURL('blocked.html') }, (tabs) => {
            if (tabs && tabs.length > 0) {
                tabs.forEach(t => chrome.tabs.remove(t.id));
            }
        });
        // Also try to close sender tab if available
        if (sender.tab?.id) {
            chrome.tabs.remove(sender.tab.id);
        }
        sendResponse({ status: 'closed' });
    }
    else if (msg.action === 'blockEvent' && sender.tab) {
        if (msg.hostname && isWhitelisted(msg.hostname)) return;
        const stats = getStats(sender.tab.id);
        stats.hostname = msg.hostname || stats.hostname;
        if (msg.type === 'popup') stats.popups++;
        else if (msg.type === 'ad') stats.ads++;
        stats.items.push({ type: msg.type, text: msg.text, time: Date.now() });
        chrome.tabs.sendMessage(sender.tab.id, { action: 'showCrunchEffect' });
        bumpLifetime(msg.type);
        sendResponse({ status: 'blocked' });
    }
    else if (msg.action === 'getStats') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                const tab = tabs[0];
                const stats = getStats(tab.id);
                let hostname = stats.hostname || '';
                if (tab.url && tab.url.includes('blocked.html')) {
                    hostname = lastBlockedHostname;
                } else if (!hostname && tab.url) {
                    try { hostname = new URL(tab.url).hostname; } catch (e) {}
                }
                stats.hostname = hostname;
                sendResponse({
                    ...stats,
                    lifetime: lifetimeStats,
                    whitelisted: hostname ? isWhitelisted(hostname) : false
                });
            } else {
                sendResponse({ hostname: '', popups: 0, ads: 0, tabsKilled: 0, items: [], lifetime: lifetimeStats });
            }
        });
        return true;
    }
    else if (msg.action === 'toggleWhitelist') {
        let raw = msg.hostname || '';
        let domain = '';
        // Extract clean hostname from any URL-like input
        try {
            if (raw.includes('://') || raw.startsWith('//')) {
                domain = new URL(raw).hostname;
            } else if (raw.includes('/')) {
                domain = new URL('https://' + raw).hostname;
            } else {
                domain = raw;
            }
        } catch (e) {
            domain = raw;
        }
        if (!domain) {
            sendResponse({ error: 'no domain could be extracted' });
            return;
        }

        const idx = whitelist.indexOf(domain);
        if (idx >= 0) {
            whitelist.splice(idx, 1);
        } else {
            whitelist.push(domain);
            customBlocklist = customBlocklist.filter(d => d !== domain);
        }
        chrome.storage.local.set({ whitelist, customBlocklist }, () => {
            setupRedirectRules();
            sendResponse({ whitelisted: whitelist.includes(domain), whitelist, domain });
        });
        return true;
    }
    else if (msg.action === 'addCustomBlock') {
        const domain = msg.domain;
        if (!domain) { sendResponse({ error: 'no domain' }); return; }
        if (!customBlocklist.includes(domain)) {
            customBlocklist.push(domain);
            chrome.storage.local.set({ customBlocklist }, () => {
                setupRedirectRules();
                sendResponse(true);
            });
        } else {
            sendResponse(false);
        }
        return true;
    }
});

// --- Navigation & tab listeners ---
chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
    if (!isEnabled) return;
    const targetUrl = details.url || '';
    if (isBadUrl(targetUrl) || targetUrl === '' || targetUrl === 'about:blank') {
        killTab(details.tabId);
        if (details.sourceTabId) {
            const stats = getStats(details.sourceTabId);
            stats.popups++;
            bumpLifetime('popup');
        }
    }
});

chrome.tabs.onCreated.addListener((tab) => {
    if (!isEnabled) return;
    const url = tab.pendingUrl || tab.url || '';
    if (isBadUrl(url)) {
        if (tab.openerTabId) {
            const stats = getStats(tab.openerTabId);
            stats.tabsKilled++;
            bumpLifetime('tab');
        }
        killTab(tab.id);
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!isEnabled) return;
    const url = changeInfo.url || tab.pendingUrl || tab.url || '';
    if (isBadUrl(url)) {
        killTab(tabId);
    }
});

chrome.alarms.create('killBadTabs', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== 'killBadTabs' || !isEnabled) return;
    chrome.tabs.query({}, (tabs) => {
        if (!tabs) return;
        for (const tab of tabs) {
            const url = tab.pendingUrl || tab.url || '';
            if (isBadUrl(url)) killTab(tab.id);
        }
    });
});

chrome.webNavigation.onCommitted.addListener((details) => {
    if (!isEnabled || details.frameId !== 0) return;
    if (isBadUrl(details.url)) chrome.tabs.remove(details.tabId);
});

// Helper to kill a tab (used in several places)
function killTab(tabId) {
    chrome.tabs.remove(tabId).catch(() => {});
}
