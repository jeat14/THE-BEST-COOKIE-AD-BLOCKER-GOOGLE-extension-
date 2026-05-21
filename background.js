// === PERSISTENT BLOCKLIST (never forgets URLs after code changes) ===
const DEFAULT_KILL_LIST = [
    "wo0f-woof.com", "opera.com", "1775995", "popsmartblocker.pro",
    "plusultraadblocker.net", "lzew-defender.pro", "continue2download.com",
    "profferstrack.com", "nonegamstopbets.co.uk", "life-iron.com",
    "1adr.com", "heroadblocker.pro", "nonstopbetting.br.com", "crcdn.org",
    "adexchangerapid.com",
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
    // Extension install scam / fake ad-blocker lure domains
    "ext-offer.com", "ext-offer.net", "ext-offer.org",
    "browser-offer.com", "browser-offer.net", "browser-offer.pro",
    "install-ext.com", "install-ext.net", "install-ext.org",
    "ext-install.com", "ext-install.net",
    "smartoffer.pro", "smart-offer.pro", "smartoffer.site",
    "best-offer.pro", "bestoffer.pro", "best-offer.site",
    "get-extension.com", "get-extension.net",
    "add-extension.com", "add-extension.net",
    "browser-extension-offer.com", "install-extension-now.com",
    "flassix.com", "thehookupcapecod.com", "luckytopclubhouse.com",
    "unblocklfe.website", "adexchangeclear.com",
    "gamerdenz.com", "gamerhit.co", "skinstrikes.com",
    "veryfo.com", "sfxly.com", "ptr.broadcasting.news", "gamingamerica.com",
    "nightdestruct.com", "chaturbate.com"
    , "32red.com"
    , "conditionfuneral.com"
    , "hotslotmagazine.com"
    , "kaninhop.info"
];

// === AD NETWORK PATTERNS for auto-close (broader than KILL_LIST) ===
// Matches URLs from common torrent/piracy site ad networks that open as new tabs.
const AD_NETWORK_PATTERNS = [
    // Pop ad networks
    'popads.net', 'popcash.net', 'popunder', 'pop.ads', 'popad',
    'propellerads.com', 'propellerclick.com',
    'juicyads.com', 'juicyadserver.com',
    'exoclick.com', 'exoads',
    'hilltopads.com', 'hilltopads.net',
    'trafficjunky.net', 'trafficjunky.com',
    'plugrush.com',
    'adsterra.com', 'adsterraserv', 'sstatic.net',
    'clickadu.com',
    'zeropark.com',
    'adcash.com',
    'yllix.com',
    'trafficfactory.biz',
    'xtendmedia.com',
    'ero-advertising.com',
    'adskeeper.co.uk', 'adskeeper.com',
    'trafficstars.com',
    'crakrevenue.com', 'craktrk.com',
    'trafficholder.com',
    'adxpansion.com',
    'adsimilis.com',
    'richpush.co',
    'adexchangerapid.com',
    'chazanboxiana.cyou',
    'adsblocked.app',
    'latestoffers.today',
    // Generic ad tracking / redirect chains
    'click.php?', 'go.php?', 'redirect.php', 'redir.php',
    'exit.php', 'track.php', 'trk.',
    'adf.ly', 'shorte.st', 'ouo.io', 'bc.vc',
    'linkbucks.com', 'lnkr.me',
    'bidvertiser.com',
    // Google / programmatic
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'adnxs.com', 'bidswitch.net',
    // Crypto ad networks often on torrent sites
    'coinzilla.io', 'bitmedia.io', 'a-ads.com', 'cointraffic.io',
    // Generic signals
    '/popunder', '/popup?', '/pop?', 'popupurl', 'popwindow',
    // Streaming ad sites (e.g. GoldenMineTV and similar)
    'goldminetv', 'goldenminetv', 'goldmine.tv',
    'streamad', 'streampop', 'videopop', 'vidads',
    // Extension install scam / fake ad-blocker lure pages
    // NOTE: keep these as full-domain suffixes only (e.g. 'ext-offer.') to avoid
    // matching legitimate businesses whose names happen to contain these words.
    'ext-offer.', 'extension-offer.', 'browser-offer.',
    'install-ext.', 'ext-install.', 'get-extension.', 'add-extension.',
    // Keep smart-offer. and best-offer. as DOMAIN patterns only (require a dot after)
    // to avoid catching query params like ?best-offer=true on legit sites.
    // The specific .pro/.site/.org domains are already in DEFAULT_KILL_LIST.
    'smart-offer.',
    'browser-extension-offer.', 'install-extension-now.',
    // Scam page path signatures (must be narrow enough not to hit legit pages)
    '/next-step?', '/install-now.html',
    // Tracking param combos exclusive to scam extension ad campaigns
    'an=ac&cid=', '?an=ac', '&an=ac',
    // Scam affiliate-style tracking param used by the popup networks seen on torrent sites
    'stamat=',
];

// Domains we never auto-close (safety whitelist)
const AUTO_CLOSE_NEVER = [
    'google.com', 'youtube.com', 'github.com', 'stackoverflow.com',
    'reddit.com', 'twitter.com', 'x.com', 'facebook.com',
    'wikipedia.org', 'amazon.com', 'bing.com', 'duckduckgo.com',
];

let KILL_LIST = [];
let customBlocklist = [];
let whitelist = [];
let isEnabled = true;

const DYNAMIC_RULE_START = 10000;
let lastBlockedHostname = '';

// Track tabs opened programmatically (openerTabId present) for fast auto-close
// Maps tabId -> { openerTabId, openedAt }
const pendingAdTabs = new Map();

let initPromise = null;

function extractHostname(raw) {
    if (!raw) return '';
    let domain = raw.trim().toLowerCase();
    try {
        if (domain.includes('://') || domain.startsWith('//')) {
            domain = new URL(domain).hostname;
        } else if (domain.includes('/')) {
            domain = new URL('https://' + domain).hostname;
        }
    } catch (e) {}
    return domain;
}

function ensureInitialized() {
    if (initPromise) return initPromise;
    initPromise = new Promise((resolve) => {
        chrome.storage.local.get([
            'enabled', 'whitelist', 'customBlocklist',
            'killList', 'removedFromKillList'
        ], (res) => {
            if (res.enabled === false) isEnabled = false;
            else isEnabled = true;

            // Migrate and clean up any full URLs/paths to clean domains
            let migrated = false;
            const cleanedWhitelist = (res.whitelist || []).map(d => {
                const clean = extractHostname(d);
                if (clean !== d) migrated = true;
                return clean;
            }).filter(Boolean);
            whitelist = [...new Set(cleanedWhitelist)];

            const cleanedCustom = (res.customBlocklist || []).map(d => {
                const clean = extractHostname(d);
                if (clean !== d) migrated = true;
                return clean;
            }).filter(Boolean);
            customBlocklist = [...new Set(cleanedCustom)];

            const storedKill = res.killList || [];
            const removed = res.removedFromKillList || [];

            const merged = [...new Set([...DEFAULT_KILL_LIST, ...storedKill])];
            KILL_LIST = merged.filter(domain => !removed.includes(domain));

            const saveState = { killList: KILL_LIST, removedFromKillList: removed };
            if (migrated) {
                saveState.whitelist = whitelist;
                saveState.customBlocklist = customBlocklist;
            }

            chrome.storage.local.set(saveState, () => {
                setupRedirectRules();
                resolve();
            });
        });
    });
    return initPromise;
}

// Start loading immediately
ensureInitialized();

// --- tab stats ---
const tabStats = {};
function getStats(tabId) {
    if (!tabStats[tabId]) tabStats[tabId] = { hostname: '', popups: 0, ads: 0, tabsKilled: 0, items: [] };
    return tabStats[tabId];
}
chrome.tabs.onRemoved.addListener((tabId) => {
    delete tabStats[tabId];
    pendingAdTabs.delete(tabId);
});

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

// Check against broad ad network patterns (for auto-close of programmatically opened tabs)
function isAdNetworkUrl(url) {
    if (!url || url === 'about:blank' || url.startsWith('chrome')) return false;
    const lower = url.toLowerCase();
    try {
        const hostname = new URL(url).hostname;
        // Never auto-close safe domains
        if (AUTO_CLOSE_NEVER.some(d => hostname === d || hostname.endsWith('.' + d))) return false;
        if (isWhitelisted(hostname)) return false;
    } catch(e) {}
    return AD_NETWORK_PATTERNS.some(p => lower.includes(p));
}

// Combined check: kill list OR ad network pattern
function isBadOrAdUrl(url) {
    return isBadUrl(url) || isAdNetworkUrl(url);
}

function setupRedirectRules() {
    // Only redirect to blocked.html for domains the USER manually added.
    // DEFAULT_KILL_LIST and AD_NETWORK_PATTERNS are handled by tabs.remove()
    // in the JS tab/navigation listeners — no blocked.html page needed.
    const allBadDomains = [...customBlocklist];
    const filtered = allBadDomains.filter(domain => !isWhitelisted(domain));

    const rules = filtered.map((domain, i) => ({
        id: DYNAMIC_RULE_START + i,
        priority: 10,
        action: {
            type: "redirect",
            redirect: { extensionPath: "/blocked.html" }
        },
        condition: {
            urlFilter: `*${domain}*`,
            resourceTypes: ["main_frame"]
        }
    }));

    const allIds = Array.from({ length: 2000 }, (_, i) => DYNAMIC_RULE_START + i);
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: allIds
    }, () => {
        chrome.declarativeNetRequest.updateDynamicRules({
            addRules: rules
        });
    });
}

// --- Navigation & tab listeners ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'closeBlockedTab' && sender.tab) {
        chrome.tabs.remove(sender.tab.id).catch(() => {});
        sendResponse({ status: 'closed' });
    }
    else if (msg.action === 'breakoutOfIframe' && sender.tab) {
        chrome.tabs.update(sender.tab.id, { url: chrome.runtime.getURL('/blocked.html') }).catch(() => {});
        sendResponse({ status: 'broken' });
    }
    else if (msg.action === 'reloadTab' && sender.tab) {
        chrome.tabs.reload(sender.tab.id, { bypassCache: true }).catch(() => {});
        sendResponse({ status: 'reloaded' });
    }
    else if (msg.action === 'closeTab' && sender.tab) {
        chrome.tabs.remove(sender.tab.id).catch(() => {});
        sendResponse({ status: 'closed' });
    }
    else if (msg.action === 'blockEvent' && sender.tab) {
        ensureInitialized().then(() => {
            if (msg.hostname && isWhitelisted(msg.hostname)) return;
            const stats = getStats(sender.tab.id);
            stats.hostname = msg.hostname || stats.hostname;
            if (msg.type === 'popup') stats.popups++;
            else if (msg.type === 'ad') stats.ads++;
            stats.items.push({ type: msg.type, text: msg.text, time: Date.now() });
            chrome.tabs.sendMessage(sender.tab.id, { action: 'showCrunchEffect' }).catch(() => {});
            bumpLifetime(msg.type);
            sendResponse({ status: 'blocked' });
        });
        return true;
    }
    else if (msg.action === 'getStats') {
        ensureInitialized().then(() => {
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
        });
        return true;
    }
    else if (msg.action === 'toggleWhitelist') {
        ensureInitialized().then(() => {
            const domain = extractHostname(msg.hostname);
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
        });
        return true;
    }
    else if (msg.action === 'addCustomBlock') {
        ensureInitialized().then(() => {
            const domain = extractHostname(msg.domain);
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
        });
        return true;
    }
    else if (msg.action === 'getLists') {
        ensureInitialized().then(() => {
            sendResponse({ whitelist, customBlocklist });
        });
        return true;
    }
    else if (msg.action === 'removeWhitelist') {
        const domain = msg.domain;
        ensureInitialized().then(() => {
            whitelist = whitelist.filter(d => d !== domain);
            chrome.storage.local.set({ whitelist }, () => {
                setupRedirectRules();
                sendResponse({ success: true, whitelist });
            });
        });
        return true;
    }
    else if (msg.action === 'removeCustomBlock') {
        const domain = msg.domain;
        ensureInitialized().then(() => {
            customBlocklist = customBlocklist.filter(d => d !== domain);
            chrome.storage.local.set({ customBlocklist }, () => {
                setupRedirectRules();
                sendResponse({ success: true, customBlocklist });
            });
        });
        return true;
    }
});

// --- Navigation & tab listeners ---

// onCreatedNavigationTarget: fires when a page opens a new tab (window.open, target=_blank, etc.)
chrome.webNavigation.onCreatedNavigationTarget.addListener(async (details) => {
    await ensureInitialized();
    if (!isEnabled) return;
    const targetUrl = details.url || '';

    // Kill if blank (torrent sites often open about:blank then redirect)
    if (targetUrl === '' || targetUrl === 'about:blank') {
        // Track this tab — watch its first real navigation
        if (details.tabId) {
            pendingAdTabs.set(details.tabId, {
                openerTabId: details.sourceTabId,
                openedAt: Date.now()
            });
            // Give it 3 seconds to navigate somewhere; if it goes to an ad URL, close it
            // (handled by webNavigation.onBeforeNavigate below)
        }
        return;
    }

    // Kill immediately if it matches kill list or ad network patterns
    if (isBadOrAdUrl(targetUrl)) {
        killTab(details.tabId);
        if (details.sourceTabId) {
            const stats = getStats(details.sourceTabId);
            stats.popups++;
            bumpLifetime('popup');
        }
        return;
    }

    // Track all tabs opened by page code (they have a sourceTabId)
    if (details.sourceTabId && details.tabId) {
        pendingAdTabs.set(details.tabId, {
            openerTabId: details.sourceTabId,
            openedAt: Date.now()
        });
    }
});

chrome.tabs.onCreated.addListener(async (tab) => {
    await ensureInitialized();
    if (!isEnabled) return;
    const url = tab.pendingUrl || tab.url || '';

    if (isBadOrAdUrl(url)) {
        if (tab.openerTabId) {
            const stats = getStats(tab.openerTabId);
            stats.tabsKilled++;
            bumpLifetime('tab');
        }
        killTab(tab.id);
        return;
    }

    // Track tabs with an opener (opened programmatically by page code)
    if (tab.openerTabId) {
        pendingAdTabs.set(tab.id, {
            openerTabId: tab.openerTabId,
            openedAt: Date.now()
        });
    }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    await ensureInitialized();
    if (!isEnabled) return;
    const url = changeInfo.url || tab.pendingUrl || tab.url || '';
    if (isBadOrAdUrl(url)) {
        killTab(tabId);
        return;
    }
    
    // Also close tabs that show Chrome's error pages from declarativeNetRequest blocking
    if (tab.title === chrome.i18n.getMessage('netErrorTitle') || 
        tab.title === 'Error' ||
        (tab.favIconUrl && tab.favIconUrl.includes('chrome-error'))) {
        // Check if this tab was opened recently (within last 5 seconds)
        chrome.tabs.get(tabId, (t) => {
            if (chrome.runtime.lastError) return;
            // Close error tabs that are trying to load blocked sites
            if (t && t.url && (t.url.includes('chrome-error') || t.url.startsWith('chrome://'))) {
                chrome.tabs.remove(t.id).catch(() => {});
            }
        });
    }
});

// Monitor navigation in pending (programmatically opened) tabs
// If such a tab navigates to an ad URL within a short window, close it.
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    await ensureInitialized();
    if (!isEnabled || details.frameId !== 0) return;

    const pending = pendingAdTabs.get(details.tabId);
    if (pending) {
        const age = Date.now() - pending.openedAt;
        const url = details.url || '';

        // Within 10 seconds of being opened, if it navigates to an ad URL → close it
        if (age < 10000 && isBadOrAdUrl(url)) {
            pendingAdTabs.delete(details.tabId);
            killTab(details.tabId);
            if (pending.openerTabId) {
                const stats = getStats(pending.openerTabId);
                stats.tabsKilled++;
                bumpLifetime('tab');
            }
            return;
        }

        // Also kill if navigating through a redirect chain that includes ad patterns
        if (age < 10000 && isAdNetworkUrl(url)) {
            pendingAdTabs.delete(details.tabId);
            killTab(details.tabId);
            if (pending.openerTabId) {
                const stats = getStats(pending.openerTabId);
                stats.tabsKilled++;
                bumpLifetime('tab');
            }
            return;
        }

        // If the tab has been open a while and navigated to a legit URL, stop tracking it
        if (age > 10000) {
            pendingAdTabs.delete(details.tabId);
        }
    }

    // Always check main frame navigations against both lists
    if (isBadUrl(details.url)) {
        try { lastBlockedHostname = new URL(details.url).hostname; } catch(e) {}
    }
});

chrome.webNavigation.onCommitted.addListener(async (details) => {
    await ensureInitialized();
    if (!isEnabled || details.frameId !== 0) return;
    if (isBadOrAdUrl(details.url)) killTab(details.tabId);
});

chrome.alarms.create('killBadTabs', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
    await ensureInitialized();
    if (alarm.name !== 'killBadTabs' || !isEnabled) return;
    chrome.tabs.query({}, (tabs) => {
        if (!tabs) return;
        for (const tab of tabs) {
            const url = tab.pendingUrl || tab.url || '';
            if (isBadOrAdUrl(url)) killTab(tab.id);
        }
    });

    // Clean up stale pending tab entries (older than 30 seconds)
    const now = Date.now();
    for (const [tabId, info] of pendingAdTabs) {
        if (now - info.openedAt > 30000) {
            pendingAdTabs.delete(tabId);
        }
    }
});

// Helper to handle blocked tab - redirects to blocked.html, falls back to closing
function killTab(tabId) {
    chrome.tabs.update(tabId, { url: chrome.runtime.getURL('/blocked.html') }).catch(() => {
        chrome.tabs.remove(tabId).catch(() => {});
    });
}
