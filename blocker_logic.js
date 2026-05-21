(function() {
    'use strict';

    // Prevent double execution
    if (window.__cookieCrunchLoaded) return;
    window.__cookieCrunchLoaded = true;

    console.log("🍪 Cookie Crunch: Activated on", location.hostname);

    // === SYNCHRONIZED SETTINGS ===
    let isEnabled = true;
    let aggressiveMode = false;
    let whitelist = [];
    let assetsUrl = '';

    function isCurrentSiteWhitelisted() {
        const host = location.hostname.toLowerCase();
        return whitelist.some(w => host === w || host.endsWith('.' + w));
    }

    window.addEventListener('message', function(event) {
        if (event.source !== window || !event.data) return;
        if (event.data.type === '__crunch_config') {
            isEnabled = event.data.enabled;
            aggressiveMode = event.data.aggressiveMode;
            whitelist = event.data.whitelist || [];
            assetsUrl = event.data.assetsUrl || '';
        }
    });

    // Request config from isolated world
    try {
        window.postMessage({ type: '__crunch_get_config' }, '*');
    } catch(e) {}

    const POPUP_EXCLUDE_SITES = [
        'copilot.microsoft.com', 'chatgpt.com', 'chat.openai.com',
        'claude.ai', 'gemini.google.com', 'perplexity.ai'
    ];
    const isExcludedSite = POPUP_EXCLUDE_SITES.some(s => location.hostname.includes(s));
    const SAFE_HOST_SUFFIXES = [
        'youtube.com', 'google.com', 'accounts.google.com', 'mail.google.com',
        'github.com', 'stackoverflow.com', 'reddit.com', 'wikipedia.org',
        'amazon.com', 'bing.com', 'duckduckgo.com',
    ];
    const HIGH_RISK_HOST_SUFFIXES = [
        'x1337x.cc', '1337x.to', '1337x.st', '1337x.so', '1337x.ws',
        'thepiratebay.org', 'thepiratebay.party', 'thepirate-bay.org', 'piratebayproxy.net',
        'limetorrents.lol', 'torrentgalaxy.to', 'eztv.re', 'yts.mx', 'nyaa.si',
        'ext.to'
    ];
    const SUSPICIOUS_TLDS = ['xyz', 'top', 'click', 'link', 'icu', 'cfd', 'work', 'site', 'pw', 'space', 'website'];
    const hostname = (location.hostname || '').toLowerCase();
    const isSafeHost = SAFE_HOST_SUFFIXES.some(h => hostname === h || hostname.endsWith('.' + h));
    const isHighRiskHost = HIGH_RISK_HOST_SUFFIXES.some(h => hostname === h || hostname.endsWith('.' + h)) ||
        hostname.includes('1337x') || hostname.includes('piratebay') || hostname.includes('torrent') || hostname.includes('streamup');
    const hostParts = hostname.split('.');
    const tld = hostParts.length ? hostParts[hostParts.length - 1] : '';
    const isSuspiciousHost = SUSPICIOUS_TLDS.includes(tld);
    let popupShieldEnabled = true;

    window.addEventListener('message', function(event) {
        try {
            if (event.source !== window) return;
            const data = event.data;
            if (!data || data.type !== '__crunch_shield') return;
            popupShieldEnabled = data.enabled !== false;
        } catch(e) {}
    });

    function shouldRunPopupKillers() {
        if (!isEnabled) return false;
        if (isCurrentSiteWhitelisted()) return false;
        if (isExcludedSite) return false;
        if (isSafeHost) return false;
        if (!popupShieldEnabled) return false;
        return isHighRiskHost || isSuspiciousHost;
    }

    let blockCount = 0;
    function reportBlock(type, detail) {
        blockCount++;
        try {
            // postMessage bridges MAIN world → ISOLATED world (content_isolated.js relays to background)
            window.postMessage({
                type: '__crunch_block',
                blockType: type,
                text: detail || ''
            }, '*');
        } catch(e) {}
    }

    let lastCrunchOverlayAt = 0;
    function showCrunchOverlay() {
        if (!shouldRunPopupKillers()) return;
        const now = Date.now();
        if (now - lastCrunchOverlayAt < 1500) return;
        lastCrunchOverlayAt = now;
        try {
            if (document.getElementById('__crunch_interstitial_overlay')) return;
            const root = document.documentElement || document.body;
            if (!root) return;

            const overlay = document.createElement('div');
            overlay.id = '__crunch_interstitial_overlay';
            overlay.style.cssText = [
                'position:fixed',
                'inset:0',
                'z-index:2147483647',
                'background:rgba(0,0,0,0.92)',
                'display:flex',
                'flex-direction:column',
                'align-items:center',
                'justify-content:center',
                'pointer-events:auto',
                'color:white',
                "font-family:'Arial Black', Arial, sans-serif"
            ].join(';');

            // Let's resolve all extension urls using assetsUrl
            const blockedPhotoUrl = assetsUrl ? (assetsUrl + 'assets/blocked-photo.jpg') : '';

            // Inject stylesheet for the overlay
            const styleEl = document.createElement('style');
            styleEl.innerHTML = `
                .__crunch_overlay_wrap {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 100%;
                    max-width: 800px;
                    padding: 20px;
                    overflow-y: auto;
                    max-height: 95vh;
                    z-index: 1;
                }
                .__crunch_overlay_wrap * {
                    box-sizing: border-box;
                    margin: 0; padding: 0;
                }
                .container {
                    margin: 15px 0;
                    padding: 25px 20px;
                    border: 4px dashed #8B4513;
                    border-radius: 20px;
                    background: rgba(35, 22, 14, 0.95);
                    max-width: 460px;
                    width: 100%;
                    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8);
                    text-align: center;
                }
                .blocked-photo {
                    max-width: 100%;
                    max-height: 500px;
                    object-fit: contain;
                    border-radius: 12px;
                    margin-bottom: 15px;
                    border: 3px solid #8B4513;
                    box-shadow: 0 6px 16px rgba(0,0,0,0.5);
                }
                .blocked-desc {
                    font-size: 14px;
                    color: #D2B48C;
                    line-height: 1.5;
                    margin-bottom: 20px;
                    font-family: Arial, sans-serif;
                    font-weight: bold;
                }
                .countdown-timer {
                    font-size: 16px;
                    color: #Fdf5e6;
                    margin-bottom: 15px;
                    font-family: Arial, sans-serif;
                }
                .btn-close {
                    background: linear-gradient(135deg, #8B4513, #A0522D);
                    color: #Fdf5e6;
                    border: none;
                    padding: 10px 28px;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    border-radius: 50px;
                    box-shadow: 0 4px 12px rgba(139, 69, 19, 0.4);
                    transition: background 0.3s, transform 0.2s;
                }
                .btn-close:hover {
                    transform: translateY(-2px);
                    background: linear-gradient(135deg, #A0522D, #cd853f);
                }
            `;
            overlay.appendChild(styleEl);

            const contentWrap = document.createElement('div');
            contentWrap.className = '__crunch_overlay_wrap';

            contentWrap.innerHTML = `
                <!-- Custom Crunched Block Container -->
                <div class="container">
                    <img class="blocked-photo" src="${blockedPhotoUrl}" alt="HAHA YOU HAVE BEEN BLOCKED MF">
                    <p class="blocked-desc">This domain has been crunched by Cookie Crunch.</p>
                    <div class="countdown-timer">Refreshing this tab in <span id="__crunch_countdown_num">5</span>s...</div>
                    <button class="btn-close" id="closeBtn">Dismiss Block Overlay</button>
                </div>
            `;
            overlay.appendChild(contentWrap);

            root.appendChild(overlay);

            // Handle the main dismiss close button
            const closeBtn = contentWrap.querySelector('#closeBtn');
            if (closeBtn) {
                closeBtn.onclick = () => {
                    overlay.remove();
                };
            }

            let remaining = 5;
            const countdownNum = contentWrap.querySelector('#__crunch_countdown_num');
            const timer = setInterval(() => {
                remaining -= 1;
                if (remaining <= 0) {
                    clearInterval(timer);
                    try { window.postMessage({ type: '__crunch_action', action: 'reloadTab' }, '*'); } catch(e) {}
                    try { location.reload(); } catch(e) {}
                    try {
                        setTimeout(() => {
                            try { window.postMessage({ type: '__crunch_action', action: 'closeTab' }, '*'); } catch(e) {}
                        }, 1800);
                    } catch(e) {}
                    try { overlay.remove(); } catch(e) {}
                    return;
                }
                if (countdownNum) countdownNum.textContent = String(remaining);
            }, 1000);
        } catch(e) {}
    }

    let lastHardBlockAt = 0;
    const EXTENSION_MODAL_TEXTS = [
        'add extension',
        'add to chrome',
        'chrome extension',
        'install extension',
        'install now',
        'download now',
        'popup blocker',
        'smart popup',
        'ad block wonder',
        'add addon',
        'add-on',
        'adobe flash player',
        'flash player',
        'out-of-date',
        'ad blocker ultra plus',
        'sports bet',
        'bet now',
        'casino',
        'gambling',
        'betting',
        'sportsbook',
        'free bet',
        'win big',
        'place your bet',
    ];
    function shouldNukeNode(node) {
        if (!shouldRunPopupKillers()) return { nuke: false, major: false };
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return { nuke: false, major: false };
        const id = node.id || '';
        if (id === '__crunch_shield_cookie' || id === '__crunch_effect_notification' || id === '__crunch_interstitial_overlay') return { nuke: false, major: false };
        
        // MAJOR BLOCKS: Trigger the "Crunch" overlay + refresh
        if (id === 'creative_image' || id === 'a_click_link' || id === 'content') return { nuke: true, major: true };
        
        // Check for specific scam domains/tracking in images or links
        try {
            const imgs = node.querySelectorAll('img');
            for (const img of imgs) {
                const src = (img.getAttribute('src') || img.src || '').toLowerCase();
                if (src.includes('adsblocked.app') || src.includes('latestoffers.today') || src.includes('chazanboxiana.cyou') || src.includes('conditionfuneral.com')) return { nuke: true, major: true };
                if (src.includes('stamat=') || (src.includes('?gc=') && src.includes('&tt='))) return { nuke: true, major: true };
            }
            const links = node.querySelectorAll('a');
            for (const a of links) {
                const href = (a.getAttribute('href') || a.href || '').toLowerCase();
                if (href.includes('adsblocked.app') || href.includes('latestoffers.today') || href.includes('stamat=')) return { nuke: true, major: true };
            }
        } catch(e) {}

        // MINOR BLOCKS: Silent removal (no refresh)
        if (id.startsWith('note-') || id.startsWith('missclick-') || id.startsWith('close-')) return { nuke: true, major: false };
        
        const cls = (typeof node.className === 'string') ? node.className : '';
        if (/(?:^|\s)pl-[a-f0-9]{6,}__/.test(cls)) return { nuke: true, major: false };
        if (cls.includes('graph') || cls.includes('creative') || cls.includes('modal')) {
            const src = (node.getAttribute('src') || '').toLowerCase();
            if (src.includes('crcdn.org') || src.includes('adexchangerapid.com')) return { nuke: true, major: false };
        }

        try {
            const text = (node.textContent || '').toLowerCase();
            if (text) {
                if (text.includes('adobe flash player') && (text.includes('out-of-date') || text.includes('out of date'))) return { nuke: true, major: true };
                if (text.includes('sports bet') || text.includes('bet now') || text.includes('place your bet') || text.includes('betting') || text.includes('casino')) return { nuke: true, major: true };
                const isExtScam = EXTENSION_MODAL_TEXTS.some(t => text.includes(t));
                if (isExtScam) {
                    // If it's fixed/absolute, it's likely a visible popup, so treat as MAJOR
                    const style = (node.getAttribute('style') || '').toLowerCase();
                    if (style.includes('fixed') || style.includes('absolute')) return { nuke: true, major: true };
                    return { nuke: true, major: false };
                }
            }
        } catch(e) {}

        return { nuke: false, major: false };
    }

    try {
        if (!shouldRunPopupKillers()) throw new Error('skip');
        const origAppendChild = Node.prototype.appendChild;
        Node.prototype.appendChild = function(child) {
            try {
                if (!shouldRunPopupKillers()) return origAppendChild.call(this, child);
                if (child && child.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                    const kids = Array.from(child.childNodes || []);
                    for (const k of kids) {
                        const res = shouldNukeNode(k);
                        if (res.nuke) {
                            try { k.remove(); } catch(e) {}
                            if (res.major) showCrunchOverlay();
                        }
                    }
                    return origAppendChild.call(this, child);
                }
                const res = shouldNukeNode(child);
                if (res.nuke) {
                    try { child.remove(); } catch(e) {}
                    if (res.major) showCrunchOverlay();
                    const now = Date.now();
                    if (now - lastHardBlockAt > 1200) {
                        lastHardBlockAt = now;
                        reportBlock('popup', res.major ? 'major scam blocked' : 'background note blocked');
                    }
                    return child;
                }
            } catch(e) {}
            return origAppendChild.call(this, child);
        };

        const origInsertBefore = Node.prototype.insertBefore;
        Node.prototype.insertBefore = function(newNode, referenceNode) {
            try {
                if (!shouldRunPopupKillers()) return origInsertBefore.call(this, newNode, referenceNode);
                if (newNode && newNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                    const kids = Array.from(newNode.childNodes || []);
                    for (const k of kids) {
                        const res = shouldNukeNode(k);
                        if (res.nuke) {
                            try { k.remove(); } catch(e) {}
                            if (res.major) showCrunchOverlay();
                        }
                    }
                    return origInsertBefore.call(this, newNode, referenceNode);
                }
                const res = shouldNukeNode(newNode);
                if (res.nuke) {
                    try { newNode.remove(); } catch(e) {}
                    if (res.major) showCrunchOverlay();
                    const now = Date.now();
                    if (now - lastHardBlockAt > 1200) {
                        lastHardBlockAt = now;
                        reportBlock('popup', res.major ? 'major scam blocked' : 'background note blocked');
                    }
                    return newNode;
                }
            } catch(e) {}
            return origInsertBefore.call(this, newNode, referenceNode);
        };
    } catch(e) {}

    try {
        if (!shouldRunPopupKillers()) throw new Error('skip');
        const origInsertAdjacentHTML = Element.prototype.insertAdjacentHTML;
        Element.prototype.insertAdjacentHTML = function(position, text) {
            try {
                if (!shouldRunPopupKillers()) return origInsertAdjacentHTML.apply(this, arguments);
                if (typeof text === 'string') {
                    const lower = text.toLowerCase();
                    const isMajor = 
                        lower.includes('creative_image') || lower.includes('a_click_link') ||
                        lower.includes('stamat=') ||
                        lower.includes('conditionfuneral.com') ||
                        lower.includes('adsblocked.app') || lower.includes('latestoffers.today') ||
                        (lower.includes('adobe flash player') && (lower.includes('out-of-date') || lower.includes('out of date'))) ||
                        (lower.includes('ad blocker ultra plus') || lower.includes('ad block wonder'));

                    const isMinor = 
                        lower.includes('id="note-') || lower.includes("id='note-") ||
                        lower.includes('id="missclick-') || lower.includes("id='missclick-") ||
                        lower.includes('crcdn.org/extban') || lower.includes('adexchangerapid.com/script/i.php');

                    if (isMajor || isMinor) {
                        const now = Date.now();
                        if (now - lastHardBlockAt > 1200) {
                            lastHardBlockAt = now;
                            reportBlock('popup', isMajor ? 'major scam html blocked' : 'background note html blocked');
                        }
                        if (isMajor) showCrunchOverlay();
                        return;
                    }
                }
            } catch(e) {}
            return origInsertAdjacentHTML.apply(this, arguments);
        };
    } catch(e) {}

    try {
        if (!shouldRunPopupKillers()) throw new Error('skip');
        const desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
        if (desc && typeof desc.set === 'function' && typeof desc.get === 'function') {
            Object.defineProperty(Element.prototype, 'innerHTML', {
                configurable: true,
                get: desc.get,
                set: function(value) {
                    try {
                        if (shouldRunPopupKillers() && typeof value === 'string') {
                            const lower = value.toLowerCase();
                            const isMajor = 
                                lower.includes('creative_image') || lower.includes('a_click_link') ||
                                lower.includes('stamat=') ||
                                lower.includes('conditionfuneral.com') ||
                                lower.includes('adsblocked.app') || lower.includes('latestoffers.today') ||
                                (lower.includes('adobe flash player') && (lower.includes('out-of-date') || lower.includes('out of date'))) ||
                                (lower.includes('ad blocker ultra plus') || lower.includes('ad block wonder'));

                            const isMinor = 
                                lower.includes('id="note-') || lower.includes("id='note-") ||
                                lower.includes('id="missclick-') || lower.includes("id='missclick-");

                            if (isMajor || isMinor) {
                                reportBlock('popup', isMajor ? 'major scam innerHTML blocked' : 'background note innerHTML blocked');
                                if (isMajor) showCrunchOverlay();
                                return desc.set.call(this, '');
                            }
                        }
                    } catch(e) {}
                    return desc.set.call(this, value);
                }
            });
        }
    } catch(e) {}

    // Expanded ad URL pattern list — used by all intercept layers
    const AD_URL_PATTERNS = [
        'doubleclick', 'googlesyndication', 'googleadservices', 'pagead2',
        'popads', 'popcash', 'popunder', 'clicktrack', 'click.php?',
        'click2go', 'adclick', 'adsrv', 'adserv', 'ad-server',
        '/lp/', 'ref=pd_sl_', 'tracking.', 'track.php', 'trk.',
        'exit.php', 'redirect.php', 'redir.php', 'go.php?',
        'stamat=',
        'propellerads', 'trafficjunky', 'revcontent', 'taboola',
        'outbrain', 'mgid.com', 'zedo.com', 'yieldmanager', 'adnxs',
        'servedby.', 'cdn.adnxs', 'ib.adnxs', 'bidswitch',
        // Torrent-specific ad networks
        'juicyads', 'exoclick', 'hilltopads', 'plugrush', 'ero-advertising',
        'adsterra', 'clickadu', 'zeropark', 'richpush', 'adcash',
        'yllix', 'popmyads', 'trafficfactory', 'xtendmedia', 'imedia.cz',
        'adf.ly', 'linkbucks', 'shorte.st', 'ouo.io', 'bc.vc',
        'bidvertiser', 'epom', 'undertone', 'conversantmedia',
        'coinzilla', 'bitmedia', 'a-ads.com', 'cointraffic',
        'adskeeper', 'adspirit', 'adspyglass', 'trafficstars',
        'lnkr.js', 'lnkr.me', 'go2ad', 'ad.fly', 'poptraffic',
        'adpopup', 'adpop', 'popuptraffic', 'popad', '1hump',
        'mediabistro', 'redtube.com/ad', 'xvideos.com/ad',
        'selfadvertiser', 'interactiveoffers', 'crakrevenue',
        'trafficholder', 'adxpansion', 'adsimilis',
        // Scam notification overlay / adult dating ad networks
        'jerkmate', 'livejasmin', 'streamate.com', 'imlive.com',
        'bongacams', 'camsoda.com', 'camcontacts', 'flirt4free',
        'stripchat', 'strip.chat', 'cam4.com', 'myfreecams',
        'adultfriendfinder', 'naughtydate', 'wildbuddies.com',
        'dating-push', 'push-notify', 'notif-push', 'notifywidget',
        'chatnotify', 'finder-x.com', 'finderx.com',
    ];

    function isAdUrl(urlStr) {
        if (!urlStr) return false;
        const lower = urlStr.toLowerCase();
        return AD_URL_PATTERNS.some(p => lower.includes(p));
    }

    function isCrossOrigin(urlStr) {
        if (!urlStr) return false;
        try {
            const u = new URL(urlStr, location.href);
            return u.hostname !== location.hostname;
        } catch(e) {
            return false;
        }
    }

    // === TRACK REAL USER GESTURES ON VISIBLE ELEMENTS ===
    // Used to distinguish genuine user clicks from click-jacked/overlay-triggered ones.
    let lastVisibleClickTime = 0;
    let lastVisibleClickTarget = null;

    function isElementVisible(el) {
        if (!el || el === document || el === window) return false;
        try {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return (
                rect.width > 0 &&
                rect.height > 0 &&
                parseFloat(style.opacity) > 0.05 &&
                style.visibility !== 'hidden' &&
                style.display !== 'none'
            );
        } catch(e) {
            return true; // assume visible on error
        }
    }

    function isLargeInvisibleOverlay(el) {
        if (!el || el === document.body || el === document.documentElement) return false;
        try {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            const pos = style.position;

            // Must be positioned element covering a significant area
            if (pos !== 'fixed' && pos !== 'absolute') return false;

            const viewW = window.innerWidth || document.documentElement.clientWidth;
            const viewH = window.innerHeight || document.documentElement.clientHeight;
            const coversArea = rect.width >= viewW * 0.4 && rect.height >= viewH * 0.4;
            if (!coversArea) return false;

            // Must be invisible or near-invisible
            const opacity = parseFloat(style.opacity);
            const invisible = (
                opacity < 0.05 ||
                style.visibility === 'hidden' ||
                (style.backgroundColor === 'transparent' || style.backgroundColor === 'rgba(0, 0, 0, 0)') &&
                !el.textContent.trim()
            );
            return invisible;
        } catch(e) {
            return false;
        }
    }

    if (shouldRunPopupKillers()) {
        // Capture mousedown first to detect overlay clicks before page handlers fire
        document.addEventListener('mousedown', function(e) {
            let el = e.target;

            // Walk up the DOM tree checking for large invisible overlays
            let currentEl = el;
            while (currentEl && currentEl !== document.body) {
                if (isLargeInvisibleOverlay(currentEl)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    reportBlock('popup', 'invisible overlay click blocked');
                    return;
                }
                currentEl = currentEl.parentElement;
            }

            // Record as a real user interaction if clicking a visible element
            if (isElementVisible(el)) {
                lastVisibleClickTime = Date.now();
                lastVisibleClickTarget = el;
            }
        }, true); // capture phase — fires before ANY page handler
        
        // Additional click handler to catch popup triggers
        document.addEventListener('click', function(e) {
            const el = e.target;
            
            // Check if clicking on elements that commonly trigger popups
            const tagName = el.tagName.toLowerCase();
            const isClickable = tagName === 'a' || tagName === 'button' || 
                                el.onclick || el.getAttribute('onclick') ||
                                el.getAttribute('data-href') ||
                                el.getAttribute('data-url');
            
            if (isClickable) {
                // Check if this element or its parent has ad-related attributes
                let current = el;
                for (let i = 0; i < 3 && current; i++) {
                    const href = current.href || current.getAttribute('href') || 
                                 current.getAttribute('data-href') || 
                                 current.getAttribute('data-url') || '';
                    
                    if (href && (isAdUrl(href) || /(redirect|clk|go|track|trk|click)/i.test(href))) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        reportBlock('popup', 'ad click blocked: ' + href.slice(0, 60));
                        return;
                    }
                    current = current.parentElement;
                }
            }
        }, true);
    }

    // === WINDOW.OPEN INTERCEPT — block ALL cross-origin opens ===
    const __realWindowOpen = window.open;
    const BLOCKED_BLANK_POPUP_ORIGINS = new Set();
    
    window.open = function() {
        if (isExcludedSite) return __realWindowOpen.apply(this, arguments);
        if (!shouldRunPopupKillers()) return __realWindowOpen.apply(this, arguments);
        const urlStr = (arguments[0] || '').toString();

        // Block blank popups aggressively
        if (!urlStr || urlStr === 'about:blank' || urlStr === 'javascript:void(0)' || urlStr === '#') {
            reportBlock('popup', 'blank popup blocked');
            // Return a fake window object that does nothing
            return {
                close: function() {},
                focus: function() {},
                blur: function() {},
                closed: true,
                location: { href: 'about:blank' }
            };
        }
        
        // Check if this popup is trying to open a blocked ad URL
        if (isAdUrl(urlStr)) {
            reportBlock('popup', 'ad popup blocked: ' + urlStr.slice(0, 80));
            return {
                close: function() {},
                focus: function() {},
                blur: function() {},
                closed: true,
                location: { href: urlStr }
            };
        }
        
        // Block any cross-origin open from high-risk sites — full stop
        if (isCrossOrigin(urlStr)) {
            if (!shouldRunPopupKillers()) return __realWindowOpen.apply(this, arguments);
            // Additional check: block known scam domain patterns
            const lowerUrl = urlStr.toLowerCase();
            if (/\.(xyz|top|click|link|icu|cfd|work|site|pw)\//.test(lowerUrl) ||
                /(redirect|clk|go|track|trk|click|adclick|stamat=)/.test(lowerUrl)) {
                reportBlock('popup', 'scam redirect blocked: ' + urlStr.slice(0, 80));
                return null;
            }
            
            reportBlock('popup', 'cross-origin popup blocked: ' + urlStr.slice(0, 80));
            return null;
        }
        return __realWindowOpen.apply(this, arguments);
    };

    // === LOCATION NAVIGATION INTERCEPT — block redirects to ad URLs ===
    // Covers location.href =, location.assign(), location.replace()
    if (shouldRunPopupKillers()) {
        try {
            const locProto = Object.getPrototypeOf(window.location);

            // Override assign
            const origAssign = window.location.assign.bind(window.location);
            try {
                Object.defineProperty(locProto, 'assign', {
                    configurable: true,
                    writable: true,
                    value: function(url) {
                        const u = (url || '').toString();
                        if (isAdUrl(u) || (isCrossOrigin(u) && Date.now() - lastVisibleClickTime > 200)) {
                            reportBlock('popup', 'location.assign blocked: ' + u.slice(0, 80));
                            return;
                        }
                        return origAssign(u);
                    }
                });
            } catch(e) {}

            // Override replace
            const origReplace = window.location.replace.bind(window.location);
            try {
                Object.defineProperty(locProto, 'replace', {
                    configurable: true,
                    writable: true,
                    value: function(url) {
                        const u = (url || '').toString();
                        if (isAdUrl(u) || (isCrossOrigin(u) && Date.now() - lastVisibleClickTime > 200)) {
                            reportBlock('popup', 'location.replace blocked: ' + u.slice(0, 80));
                            return;
                        }
                        return origReplace(u);
                    }
                });
            } catch(e) {}

            // Override href setter
            const hrefDesc = Object.getOwnPropertyDescriptor(locProto, 'href');
            if (hrefDesc && hrefDesc.set) {
                Object.defineProperty(locProto, 'href', {
                    configurable: true,
                    get: hrefDesc.get,
                    set: function(val) {
                        const u = (val || '').toString();
                        if (isAdUrl(u) || (isCrossOrigin(u) && Date.now() - lastVisibleClickTime > 200)) {
                            reportBlock('popup', 'location.href blocked: ' + u.slice(0, 80));
                            return;
                        }
                        return hrefDesc.set.call(this, val);
                    }
                });
            }
        } catch(e) {}

        // Also patch window.location directly as a fallback
        try {
            const origWindowLocation = Object.getOwnPropertyDescriptor(window, 'location');
            // Can't fully replace window.location but we can override document.location
            const docLocDesc = Object.getOwnPropertyDescriptor(document, 'location');
            if (docLocDesc && docLocDesc.set) {
                Object.defineProperty(document, 'location', {
                    configurable: true,
                    get: docLocDesc.get,
                    set: function(val) {
                        const u = (val || '').toString();
                        if (isAdUrl(u)) {
                            reportBlock('popup', 'document.location blocked');
                            return;
                        }
                        return docLocDesc.set.call(this, val);
                    }
                });
            }
        } catch(e) {}
    }

    // === FORM SUBMISSION INTERCEPT — block form posts to ad URLs ===
    if (shouldRunPopupKillers()) {
        // Override programmatic form.submit()
        const origFormSubmit = HTMLFormElement.prototype.submit;
        HTMLFormElement.prototype.submit = function() {
            const action = (this.action || '').toString();
            if (isAdUrl(action) || (isCrossOrigin(action) && Date.now() - lastVisibleClickTime > 200)) {
                reportBlock('popup', 'form submit blocked: ' + action.slice(0, 80));
                return;
            }
            return origFormSubmit.call(this);
        };

        // Also intercept submit events
        document.addEventListener('submit', function(e) {
            const form = e.target;
            if (!form || form.tagName !== 'FORM') return;
            const action = (form.action || '').toString();
            if (isAdUrl(action) || (isCrossOrigin(action) && Date.now() - lastVisibleClickTime > 200)) {
                e.preventDefault();
                e.stopImmediatePropagation();
                reportBlock('popup', 'form submit event blocked: ' + action.slice(0, 80));
            }
        }, true);
    }

    // === INTERCEPT <a target="_blank"> clicks that would open cross-origin ad tabs ===
    if (shouldRunPopupKillers()) {
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a[target="_blank"], a[target="_new"], a[target="_tab"]');
            if (!link || !link.href) return;
            const href = link.href;
            if (href.startsWith('javascript:') || href.startsWith('#')) return;
            try {
                const u = new URL(href, location.href);
                if (u.hostname === location.hostname) return; // same-origin, allow
                if (isAdUrl(href)) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    reportBlock('popup', 'ad link: ' + u.hostname);
                }
            } catch(err) {}
        }, true); // capture phase — fires before page handlers
    }

    // === DYNAMICALLY CREATED AD IFRAMES — block on insert ===
    if (shouldRunPopupKillers()) {
        const origCreateElement = document.createElement.bind(document);
        document.createElement = function(tag) {
            const el = origCreateElement(tag);
            if (tag.toLowerCase() === 'iframe') {
                // Intercept src attribute being set on the iframe
                const origSetAttribute = el.setAttribute.bind(el);
                el.setAttribute = function(name, value) {
                    if (name.toLowerCase() === 'src' && isAdUrl((value || '').toString())) {
                        reportBlock('ad', 'ad iframe blocked: ' + (value || '').slice(0, 80));
                        return; // don't set the src
                    }
                    return origSetAttribute(name, value);
                };
            }
            return el;
        };
    }

    // === YOUTUBE AD SKIPPER ===
    let lastSkipAttempt = 0;

    const isYouTubeAdPlaying = () => {
        // Multiple detection signals for robustness
        if (document.querySelector('.ad-showing')) return true;
        if (document.querySelector('.ytp-ad-player-overlay')) return true;
        if (document.querySelector('.ytp-ad-simple-ad-badge')) return true;
        if (document.querySelector('.ytp-ad-preview-container')) return true;
        if (document.querySelector('.ytp-ad-progress')) return true;
        const player = document.getElementById('movie_player');
        if (player && player.classList.contains('ad-showing')) return true;
        return false;
    };

    const handleYouTube = () => {
        if (!location.hostname.includes('youtube.com')) return;

        // Close overlay/banner ads first (these don't need throttle)
        const overlayClose = document.querySelector(
            '.ytp-ad-overlay-close-button, .ytp-ad-overlay-close-container button'
        );
        if (overlayClose && overlayClose.offsetParent !== null) {
            try { overlayClose.click(); reportBlock('ad', 'youtube overlay closed'); } catch(e) {}
        }

        if (!isYouTubeAdPlaying()) return;

        // Throttle skip attempts to 500ms
        const now = Date.now();
        if (now - lastSkipAttempt < 500) return;
        lastSkipAttempt = now;

        // 1. Try skip button (skippable ads)
        const skipButtons = document.querySelectorAll(
            '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, ' +
            'button.ytp-ad-skip-button-modern, [id^="skip-button"], .videoAdUiSkipButton, ' +
            '.ytp-ad-skip-button-slot button, .ytp-ad-skip-button-container button'
        );
        for (const btn of skipButtons) {
            if (btn && btn.offsetParent !== null) {
                try {
                    btn.click();
                    reportBlock('ad', 'youtube ad skipped');
                    return;
                } catch(e) {}
            }
        }

        // 2. Unskippable ad — mute and seek video to end to force ad to finish
        try {
            const player = document.getElementById('movie_player');
            if (!player) return;
            const video = player.querySelector('video');
            if (video && isFinite(video.duration) && video.duration > 0) {
                const wasMuted = video.muted;
                video.muted = true;
                video.currentTime = video.duration;
                video.addEventListener('ended', function onAdEnded() {
                    setTimeout(() => {
                        try {
                            video.muted = wasMuted;
                            if (video.paused) video.play().catch(() => {});
                        } catch(e) {}
                    }, 300);
                }, { once: true });
                setTimeout(() => { try { video.muted = wasMuted; } catch(e) {} }, 800);
                reportBlock('ad', 'youtube unskippable ad force-ended');
            }
        } catch(e) {}
    };

    // Run YouTube handler every 500ms for faster response
    if (location.hostname.includes('youtube.com')) {
        setInterval(() => {
            if (!isEnabled || isCurrentSiteWhitelisted()) return;
            handleYouTube();
        }, 500);
    }

    // === SCAM NOTIFICATION OVERLAY KILLER ===
    // Keywords found in DOM-injected fake call/chat notification ads
    const SCAM_KEYWORDS = [
        'missed video call', 'missed calls', 'join the video call', 'video call now',
        'has something to show', 'wants to chat', 'wants to show', 'is waiting for you',
        'single women', 'single girls', 'single ladies', 'lonely women',
        'dating', 'meet now', 'chat now', 'hook up', 'hookup',
        'naughty', 'horny', 'flirt', 'adult friend',
        'jerkmate', 'chaturbate', 'livejasmin', 'streamate',
        'click to accept', 'accept the call', 'answer call',
        'chat now', 'private show', 'live now', 'online now',
        'in your area', 'near you', 'close by', 'local',
        'free chat', 'free cam', 'free live', 'free video',
        'sexy', 'sexy singles', 'hot singles', 'hot girls',
        'play now', 'watch now', 'start chatting',
        'video chat', 'cam chat', 'live cam', 'live girls',
        'sports bet', 'bet now', 'casino', 'gambling', 'betting', 'sportsbook',
        'free bet', 'win big', 'place your bet',
    ];

    // Scam iframe src patterns (domains that host notification overlay widgets)
    const SCAM_IFRAME_PATTERNS = [
        'jerkmate', 'livejasmin', 'streamate', 'imlive', 'bongacams', 'camsoda',
        'camcontacts', 'flirt4free', 'stripchat', 'strip.chat', 'cam4.com',
        'myfreecams', 'adultfriendfinder', 'naughtydate', 'wildbuddies',
        'dating-push', 'push-notify', 'notif-push', 'notifywidget', 'chatnotify',
        'finder-x.com', 'finderx.com', 'onlyfans', 'fansly', 'justforfans',
        'pornhub', 'xvideos', 'xnxx', 'youporn', 'redtube', 'tube8',
        'spankbang', 'chaturbate', 'cams.com', 'peekvids', 'porntrex',
    ];

    function hasScamText(el) {
        try {
            const text = (el.textContent || '').toLowerCase();
            return SCAM_KEYWORDS.some(kw => text.includes(kw));
        } catch(e) { return false; }
    }

    function isScamOverlayEl(el) {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
        if (el === document.body || el === document.documentElement) return false;
        if (el.id === '__crunch_shield_cookie' || el.id === '__crunch_effect_notification') return false;
        try {
            const style = el.getAttribute('style') || '';
            const tag = (el.tagName || '').toLowerCase();

            // Block iframes from known scam/adult notification networks
            if (tag === 'iframe') {
                const src = (el.getAttribute('src') || el.src || '').toLowerCase();
                if (SCAM_IFRAME_PATTERNS.some(p => src.includes(p))) return true;
            }

            // Blue bubble: specific colour used by this ad family
            if (style.includes('57, 154, 254') || style.includes('57,154,254') ||
                style.includes('399afe') || style.includes('399AFE') ||
                style.includes('#399')) return true;

            // Known ID/class prefixes injected by scam notification scripts
            const id = el.id || '';
            const cls = (el.className && typeof el.className === 'string') ? el.className : '';
            if (/^note-|^missclick-/.test(id)) return true;
            if (/pl-__/.test(cls)) return true;

            // Fixed/absolute + very high z-index inline = almost always an overlay ad
            const hasFixed = style.includes('position: fixed') || style.includes('position:fixed') ||
                             style.includes('position: absolute') || style.includes('position:absolute');
            const zMatch = /z-index\s*:\s*(\d+)/.exec(style);
            const zVal = zMatch ? parseInt(zMatch[1]) : 0;

            if (hasFixed && zVal > 9000) {
                // Confirm with text content — avoid nuking legitimate high-z overlays
                if (hasScamText(el)) return true;
                // Small widget dimensions typical of notification bubbles
                if (zVal >= 2147483647) return true; // INT_MAX — nearly always scam
            }

            // High z-index + scam text anywhere in the subtree
            if (zVal > 9000 && hasScamText(el)) return true;

            return false;
        } catch(e) { return false; }
    }

    function removeScamEl(el) {
        try {
            el.style.cssText = 'display:none!important';
            el.remove();
            const now = Date.now();
            if (!removeScamEl._last || now - removeScamEl._last > 800) {
                removeScamEl._last = now;
                reportBlock('popup', 'scam overlay');
            }
        } catch(e) {}
    }

    // Dynamic scanner targeting the sandboxed innerIframe overlay patterns
    function killFullscreenInnerIframeOverlays() {
        if (isExcludedSite) return;
        try {
            // Find all matching iframes (case-insensitive id contains "innerIframe")
            const innerIframes = [];
            document.querySelectorAll('iframe').forEach(iframe => {
                const id = (iframe.id || '').toLowerCase();
                if (id === 'inneriframe' || id.includes('inneriframe')) {
                    innerIframes.push(iframe);
                }
            });

            // Find all fixed full-screen overlay divs with ultra-high z-indices
            document.querySelectorAll('div').forEach(div => {
                try {
                    const style = div.getAttribute('style') || '';
                    const hasFixed = style.includes('position: fixed') || style.includes('position:fixed') ||
                                     style.includes('position: absolute') || style.includes('position:absolute');
                    if (!hasFixed) return;

                    // Parse z-index
                    const zMatch = /z-index\s*:\s*(\d+)/.exec(style);
                    const zVal = zMatch ? parseInt(zMatch[1]) : 0;

                    // Max z-index or high overlay z-indices
                    if (zVal >= 999999 || style.includes('2147483647')) {
                        // Check if fullscreen sized
                        const isFullScreen = (
                            style.includes('width:100%') || style.includes('width: 100%') ||
                            style.includes('height:100%') || style.includes('height: 100%') ||
                            ((style.includes('left:0') || style.includes('left: 0')) && 
                             (style.includes('right:0') || style.includes('right: 0')) &&
                             (style.includes('top:0') || style.includes('top: 0')) &&
                             (style.includes('bottom:0') || style.includes('bottom: 0')))
                        );

                        if (isFullScreen) {
                            // If innerIframe is present on page OR div text is extremely short (transparent cover)
                            const textLen = (div.textContent || '').trim().length;
                            if (innerIframes.length > 0 || textLen < 50) {
                                removeScamEl(div);
                            }
                        }
                    }
                } catch(e) {}
            });

            // Remove the innerIframe elements themselves
            innerIframes.forEach(iframe => {
                removeScamEl(iframe);
            });

            // Force restore overflow scrollability on document/body elements
            if (innerIframes.length > 0) {
                document.querySelectorAll('html, body').forEach(el => {
                    const style = window.getComputedStyle(el);
                    if (style.overflow === 'hidden') {
                        el.style.setProperty('overflow', 'auto', 'important');
                    }
                });
            }
        } catch(e) {}
    }

    // Immediate DOM scan — runs always (not gated by aggressiveMode)
    function killScamOverlays() {
        if (isExcludedSite) return;
        try {
            killFullscreenInnerIframeOverlays();
            // Fast selector pass for known patterns
            document.querySelectorAll(
                '[id^="note-"], [id^="missclick-"], [class*="pl-__"], ' +
                'iframe[src*="jerkmate"], iframe[src*="livejasmin"], iframe[src*="streamate"], ' +
                'iframe[src*="bongacams"], iframe[src*="chaturbate.com/in/"], iframe[src*="stripchat"], ' +
                'iframe[src*="adultfriendfinder"], iframe[src*="dating-push"], ' +
                'div[style*="57, 154, 254"], div[style*="57,154,254"], ' +
                'div[style*="border-radius: 55px"][style*="background"]'
            ).forEach(el => { try { removeScamEl(el); } catch(e) {} });

            // Broader scan for high-z-index scam text overlays
            document.querySelectorAll('div[style*="position: fixed"], div[style*="position:fixed"]').forEach(el => {
                if (isScamOverlayEl(el)) removeScamEl(el);
            });
            
            // Scan for blue bubble notification popups (position: relative with blue background)
            document.querySelectorAll('div[style*="border-radius: 55px"], div[style*="border-radius:55px"]').forEach(el => {
                const style = el.getAttribute('style') || '';
                // Check for blue background (rgb(57, 154, 254) or similar blue)
                if (style.includes('rgb(57, 154, 254)') || 
                    style.includes('rgb(57,154,254)') ||
                    style.includes('#399afe') ||
                    style.includes('#399AFE') ||
                    (style.includes('background') && style.includes('154, 254'))) {
                    removeScamEl(el);
                }
            });
            
            // Also scan for any divs with blue background and high border radius
            document.querySelectorAll('div').forEach(el => {
                try {
                    const style = el.getAttribute('style') || '';
                    if ((style.includes('57, 154, 254') || style.includes('57,154,254')) &&
                        (style.includes('border-radius: 55px') || style.includes('border-radius:55px'))) {
                        removeScamEl(el);
                    }
                } catch(e) {}
            });

            // Scan for gambling/sports bet popups
            document.querySelectorAll('div, section, article').forEach(el => {
                try {
                    const text = (el.textContent || '').toLowerCase();
                    if (text.includes('sports bet') || text.includes('bet now') || 
                        text.includes('place your bet') || text.includes('betting') || 
                        text.includes('casino') || text.includes('sportsbook')) {
                        const style = window.getComputedStyle(el);
                        if (style.position === 'fixed' || style.position === 'absolute' || parseInt(style.zIndex) > 1000) {
                            removeScamEl(el);
                            showCrunchOverlay();
                        }
                    }
                } catch(e) {}
            });

            // Target the specific "X" close button pattern seen in sports bet popups
            document.querySelectorAll('div, span').forEach(el => {
                try {
                    if (el.textContent === 'X' || el.textContent === '✕') {
                        const style = window.getComputedStyle(el);
                        if (style.position === 'absolute' || style.position === 'fixed') {
                            const parent = el.parentElement;
                            if (parent && (parent.textContent.toLowerCase().includes('bet') || parent.textContent.toLowerCase().includes('casino'))) {
                                removeScamEl(parent);
                                showCrunchOverlay();
                            }
                        }
                    }
                } catch(e) {}
            });
        } catch(e) {}
    }

    // MutationObserver — fires immediately when scam overlays are injected into DOM
    if (shouldRunPopupKillers()) {
        const scamOverlayObserver = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;
                    
                    // Direct check for the iframe or its containing overlay
                    const tag = node.tagName.toLowerCase();
                    const id = (node.id || '').toLowerCase();
                    const style = node.getAttribute('style') || '';
                    
                    if (tag === 'iframe' && (id === 'inneriframe' || id.includes('inneriframe'))) {
                        killFullscreenInnerIframeOverlays();
                        continue;
                    }
                    
                    // If a max z-index full-screen overlay div is injected
                    if (tag === 'div' && (style.includes('z-index: 2147483647') || style.includes('z-index:2147483647') || style.includes('z-index: 999999') || style.includes('z-index:999999'))) {
                        killFullscreenInnerIframeOverlays();
                        continue;
                    }

                    if (isScamOverlayEl(node)) {
                        removeScamEl(node);
                        continue;
                    }

                    // Also check immediate children (some scripts wrap in a container)
                    try {
                        if (node.querySelector('iframe[id*="innerIframe" i], #innerIframe')) {
                            killFullscreenInnerIframeOverlays();
                        }
                        
                        node.querySelectorAll(
                            '[id^="note-"], [id^="missclick-"], [class*="pl-__"], ' +
                            'iframe[src*="jerkmate"], iframe[src*="livejasmin"], ' +
                            'iframe[src*="bongacams"], iframe[src*="stripchat"], ' +
                            'iframe[src*="adultfriendfinder"], ' +
                            'div[style*="57, 154, 254"], div[style*="57,154,254"], ' +
                            'div[style*="border-radius: 55px"], div[style*="border-radius:55px"]'
                        ).forEach(child => {
                            if (!child.closest('[id^="note-"]') || child === node) {
                                // Double-check for blue bubble pattern
                                const style = child.getAttribute('style') || '';
                                if ((style.includes('57, 154, 254') || style.includes('57,154,254') || 
                                     style.includes('#399afe') || style.includes('#399AFE')) &&
                                    (style.includes('border-radius: 55px') || style.includes('border-radius:55px'))) {
                                    removeScamEl(child);
                                } else if (style.includes('57, 154, 254') || style.includes('57,154,254')) {
                                    removeScamEl(child);
                                } else {
                                    removeScamEl(child);
                                }
                            }
                        });
                    } catch(e) {}
                }
            }
        });

        function startScamObserver() {
            if (!document.body) { setTimeout(startScamObserver, 50); return; }
            scamOverlayObserver.observe(document.body, { childList: true, subtree: true });
        }
        startScamObserver();
    }

    // === ALWAYS-ON innerIframe/fullscreen overlay observer (runs on ALL sites) ===
    // These patterns are NEVER legitimate — safe to intercept universally
    if (!isExcludedSite) {
        const innerIframeObserver = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;
                    const tag = (node.tagName || '').toLowerCase();
                    const id = (node.id || '').toLowerCase();
                    const style = node.getAttribute ? (node.getAttribute('style') || '') : '';

                    // Direct innerIframe injection
                    if (tag === 'iframe' && (id === 'inneriframe' || id.includes('inneriframe'))) {
                        killFullscreenInnerIframeOverlays();
                        continue;
                    }

                    // Fullscreen transparent overlay div with max z-index
                    if (tag === 'div' && (style.includes('2147483647') || style.includes('z-index: 999999') || style.includes('z-index:999999'))) {
                        const hasFixed = style.includes('position: fixed') || style.includes('position:fixed') ||
                                         style.includes('position: absolute') || style.includes('position:absolute');
                        if (hasFixed) {
                            killFullscreenInnerIframeOverlays();
                            continue;
                        }
                    }

                    // Check children for wrapped injection
                    try {
                        if (node.querySelector && node.querySelector('iframe[id*="innerIframe" i], #innerIframe')) {
                            killFullscreenInnerIframeOverlays();
                        }
                    } catch(e) {}
                }
            }
        });

        function startInnerIframeObserver() {
            if (!document.body) { setTimeout(startInnerIframeObserver, 50); return; }
            innerIframeObserver.observe(document.body, { childList: true, subtree: true });
        }
        startInnerIframeObserver();
    }

    // === SCAM POPUP KILLER (periodic sweep, aggressiveMode only for broader heuristics) ===
    function killScamPopups() {
        if (!shouldRunPopupKillers()) return;

        // Always-on: targeted patterns
        killScamOverlays();

        // Aggressive-only: broader sweep
        if (!aggressiveMode) return;

        document.querySelectorAll('video[src*="nightdestruct"], video[src*="chaturbate"]').forEach(el => {
            try { reportBlock('ad', 'scam video'); el.remove(); } catch(e) {}
        });
    }

    // === AD KILLER ===
    function killGenericAds() {
        if (!aggressiveMode) return;
        try {
            document.querySelectorAll('iframe[src*="doubleclick"], iframe[src*="googlesyndication"]').forEach(el => {
                try { reportBlock('ad', 'ad iframe'); el.remove(); } catch(e) {}
            });

            document.querySelectorAll('[id*="google_ads"], [id*="aswift_"]').forEach(el => {
                try {
                    if (el.offsetWidth > 0 && el.offsetHeight > 0) {
                        reportBlock('ad', 'ad element');
                        el.remove();
                    }
                } catch(e) {}
            });
        } catch(e) {}
    }

    // === GAMBLING BANNER REPLACER ===
    function replaceGamblingBanners() {
        if (!isEnabled || isCurrentSiteWhitelisted()) return;
        
        const host = location.hostname.toLowerCase();
        const isStreamup = host.includes('streamup');

        // Scan for elements that look like gambling banners or hero_banner
        document.querySelectorAll('div, section, a').forEach(el => {
            try {
                // Avoid replacing our own extension overlay or popup elements
                if (el.id === '__crunch_interstitial_overlay' || el.closest('#__crunch_interstitial_overlay') || el.id === '__crunch_shield_cookie' || el.closest('#__crunch_shield_cookie')) {
                    return;
                }
                
                // Avoid double-replacing or nested replacing inside already replaced elements
                if (el.querySelector('[alt="hah u been blocked mf"]') || el.closest('[style*="blocked-photo.jpg"]')) {
                    return;
                }

                const id = (el.id || '').toLowerCase();
                const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();
                const text = (el.textContent || '').toLowerCase();
                
                let isGamblingBanner = false;
                
                // Target ID or Class matching hero_banner/banner
                if (id === 'hero_banner' || cls.includes('hero_banner') || id === 'banner') {
                    // Check if it contains gambling content OR the specific GIF OR we're on Streamup
                    const html = el.innerHTML.toLowerCase();
                    if (html.includes('sports bet') || 
                        html.includes('sportsbet') || 
                        html.includes('betting') || 
                        html.includes('casino') || 
                        html.includes('sportsbook') ||
                        html.includes('third-version.gif') ||
                        (isStreamup && (id === 'hero_banner' || cls.includes('hero_banner') || id === 'banner'))) {
                        isGamblingBanner = true;
                    }
                }
                
                // Also target any element containing "sports bet" text that is a banner shape
                if (!isGamblingBanner && (text === 'sports bet' || text.includes('sports bet'))) {
                    // If it is a header banner or has banner classes
                    if (cls.includes('banner') || id.includes('banner') || el.offsetWidth > 200) {
                        isGamblingBanner = true;
                    }
                }

                if (isGamblingBanner) {
                    const blockedPhotoUrl = assetsUrl ? (assetsUrl + 'assets/blocked-photo.jpg') : '';
                    
                    // Replace inner content with the custom blocked Duel promo banner!
                    el.innerHTML = `
                        <a href="https://www.duel.com/r/streamup" id="banner" target="_blank" style="display:block; width:100%; height:100%;">
                            <img src="${blockedPhotoUrl}" alt="hah u been blocked mf" style="width:100%; height:100%; object-fit:cover; display:block; border-radius:12px; border:3px solid #8B4513; box-shadow:0 8px 24px rgba(0,0,0,0.5);">
                        </a>
                        <span class="close_banner" style="position:absolute; top:8px; right:8px; background:#8B4513; color:#Fdf5e6; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; font-size:12px; border:2px solid #Fdf5e6; z-index:10;">X</span>
                    `;
                    el.style.position = 'relative';
                    el.style.display = 'flex';
                    el.style.alignItems = 'center';
                    el.style.justifyContent = 'center';
                    
                    // Handle the close button
                    const closeBtn = el.querySelector('.close_banner');
                    if (closeBtn) {
                        closeBtn.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            el.style.display = 'none';
                        };
                    }
                    
                    reportBlock('ad', 'replaced gambling banner');
                }
            } catch(e) {}
        });
    }

    if (shouldRunPopupKillers()) {
        if (window.Notification) {
            const origRequestPermission = Notification.requestPermission;
            Notification.requestPermission = function() {
                reportBlock('popup', 'notification');
                return Promise.resolve('denied');
            };
        }

        if (navigator.serviceWorker) {
            const origRegister = navigator.serviceWorker.register;
            navigator.serviceWorker.register = function(url) {
                const urlStr = (url || '').toString().toLowerCase();
                const badSW = ['pushwoosh', 'onesignal', 'pushengage', 'pushcrew'];
                if (badSW.some(d => urlStr.includes(d))) {
                    reportBlock('ad', 'push service worker');
                    return Promise.reject(new Error('blocked'));
                }
                return origRegister.apply(this, arguments);
            };
        }
    }

    // === AD SCRIPT BLOCKER ===
    const AD_SCRIPT_NAMES = ['/ads.js', '/pagead.js', '/advertisement.js', '/tracking.js', 'pop-ad.js', 'pop-ad'];
    const scriptObserver = new MutationObserver((mutations) => {
        if (!shouldRunPopupKillers()) return;
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.tagName === 'SCRIPT' && node.src) {
                    const src = node.src.toLowerCase();
                    if (AD_SCRIPT_NAMES.some(n => src.includes(n)) || isAdUrl(src)) {
                        node.remove();
                        reportBlock('ad', 'script: ' + src.split('/').pop());
                    }
                }
            }
        }
    });
    if (shouldRunPopupKillers() && document.documentElement) {
        scriptObserver.observe(document.documentElement, { childList: true, subtree: true });
    }

    if (shouldRunPopupKillers()) {
        const cleanupNow = () => {
            try {
                killFullscreenInnerIframeOverlays();
            } catch(e) {}
            try {
                document.querySelectorAll('[id^="note-"], [id^="missclick-"], [id^="close-"], img.graph, img[src*="crcdn.org"], img[src*="adexchangerapid.com"]').forEach(el => {
                    try { el.remove(); } catch(e) {}
                });
            } catch(e) {}
            try { replaceGamblingBanners(); } catch(e) {}
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', cleanupNow, { once: true });
        } else {
            cleanupNow();
        }
        setTimeout(cleanupNow, 250);
    }
    
    // Start killers
    function startKillers() {
        if (!document.body) {
            setTimeout(startKillers, 100);
            return;
        }
        try { 
            killFullscreenInnerIframeOverlays();
            replaceGamblingBanners(); 
        } catch(e) {}
        // Regular slower scan
        setInterval(() => {
            if (!isEnabled || isCurrentSiteWhitelisted()) return;
            killFullscreenInnerIframeOverlays();
            killScamPopups();
            killGenericAds();
            replaceGamblingBanners();
        }, 3000);
    }
    
    startKillers();

    // === COOKIE CONSENT AUTO-DISMISS ===
    const REJECT_SELECTORS = [
        '[data-action="reject"]', '#onetrust-reject-all-handler', 
        '.cky-btn-reject', '#CybotCookiebotDialogBodyButtonDecline',
        'button[id*="reject" i]', 'button[class*="reject" i]',
        '.cc-deny'
    ];

    const ACCEPT_SELECTORS = [
        '#onetrust-accept-btn-handler', '.cc-accept', '.cc-allow',
        '.cky-btn-accept', '#didomi-notice-agree-button'
    ];

    const CLOSE_SELECTORS = [
        '.cookie-close', '.cookie-dismiss', '.cc-close',
        'button[aria-label*="close" i]'
    ];

    function dismissCookies() {
        for (const sel of REJECT_SELECTORS) {
            const btn = document.querySelector(sel);
            if (btn && btn.offsetParent !== null) {
                try { btn.click(); reportBlock('popup', 'cookie rejected'); return; } catch(e) {}
            }
        }
        for (const sel of ACCEPT_SELECTORS) {
            const btn = document.querySelector(sel);
            if (btn && btn.offsetParent !== null) {
                try { btn.click(); reportBlock('popup', 'cookie accepted'); return; } catch(e) {}
            }
        }
        for (const sel of CLOSE_SELECTORS) {
            const btn = document.querySelector(sel);
            if (btn && btn.offsetParent !== null) {
                try { btn.click(); reportBlock('popup', 'cookie closed'); return; } catch(e) {}
            }
        }
    }

    function startCookieKiller() {
        if (!document.body) {
            setTimeout(startCookieKiller, 200);
            return;
        }
        [500, 1500, 3000, 5000].forEach(t => {
            setTimeout(dismissCookies, t);
        });
    }

    startCookieKiller();

    // === ANTI-ADBLOCK WALL ===
    function bypassAdblockWalls() {
        if (!shouldRunPopupKillers()) return;
        const WALL_TEXTS = [
            "ad blocker", "adblocker", "disable your ad",
            "turn off your ad", "ad block detected"
        ];
        
        try {
            document.querySelectorAll('div[style*="position: fixed"], div[style*="position: absolute"]').forEach(el => {
                try {
                    const text = (el.textContent || '').toLowerCase();
                    if (WALL_TEXTS.some(t => text.includes(t))) {
                        const z = parseInt(window.getComputedStyle(el).zIndex);
                        if (!isNaN(z) && z > 100) {
                            reportBlock('popup', 'adblock wall');
                            el.remove();
                        }
                    }
                } catch(e) {}
            });
        } catch(e) {}
    }

    setInterval(() => {
        if (!isEnabled || isCurrentSiteWhitelisted()) return;
        bypassAdblockWalls();
    }, 5000);

})();
