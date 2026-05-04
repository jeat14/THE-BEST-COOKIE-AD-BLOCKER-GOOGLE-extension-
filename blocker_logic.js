(function() {
    'use strict';

    // Prevent double execution
    if (window.__cookieCrunchLoaded) return;
    window.__cookieCrunchLoaded = true;

    console.log("🍪 Cookie Crunch: Activated on", location.hostname);

    // === AGGRESSIVE MODE ===
    let aggressiveMode = false;
    (async function loadAggressiveMode() {
        try {
            const res = await chrome.storage.local.get('aggressiveMode');
            aggressiveMode = res.aggressiveMode || false;
            console.log("🍪 Aggressive Mode:", aggressiveMode ? "ON" : "OFF");
        } catch(e) {}
    })();

    // Sites to exclude from aggressive popup detection
    const POPUP_EXCLUDE_SITES = [
        'copilot.microsoft.com', 'chatgpt.com', 'chat.openai.com',
        'claude.ai', 'gemini.google.com', 'perplexity.ai'
    ];
    const isExcludedSite = POPUP_EXCLUDE_SITES.some(s => location.hostname.includes(s));

    let blockCount = 0;
    function reportBlock(type, detail) {
        blockCount++;
        try {
            document.dispatchEvent(new CustomEvent('crunch-blocked', {
                detail: { type: type, text: detail || '', count: blockCount }
            }));
        } catch(e) {}
    }

    // Save real window.open
    const __realWindowOpen = window.open;
    window.open = function() {
        if (isExcludedSite) return __realWindowOpen.apply(this, arguments);
        const urlStr = (arguments[0] || '').toString();
        if (!urlStr || urlStr === 'about:blank') {
            reportBlock('popup', 'blank popup');
            return null;
        }
        const AD_PATTERNS = ['doubleclick', 'googlesyndication', '/lp/', 'ref=pd_sl_', 'popads', 'clicktrack'];
        if (AD_PATTERNS.some(p => urlStr.includes(p))) {
            reportBlock('popup', 'ad popup');
            return null;
        }
        try {
            const u = new URL(urlStr, location.href);
            if (u.hostname === location.hostname) return __realWindowOpen.apply(this, arguments);
        } catch(e) {}
        reportBlock('popup', 'popup');
        return null;
    };

    // === YOUTUBE AD SKIPPER ===
    let wasAd = false;
    const handleYouTube = () => {
        if (!location.hostname.includes('youtube.com')) return;
        const player = document.getElementById('movie_player');
        const video = document.querySelector('video');
        if (!video || !player) return;

        if (player.classList.contains('ad-showing')) {
            wasAd = true;
            video.muted = true;
            try { video.playbackRate = 16; } catch(e) {}
            document.querySelectorAll('.ytp-ad-skip-button, .ytp-ad-skip-button-modern').forEach(btn => {
                if (btn && btn.offsetParent) btn.click();
            });
        } else if (wasAd) {
            wasAd = false;
            video.muted = false;
            video.playbackRate = 1;
            if (video.paused) video.play().catch(() => {});
        }
    };

    // === SCAM POPUP KILLER - MINIMAL, ONLY KILL OBVIOUS SCAMS ===
    const SCAM_IDS = ['note-', 'missclick-']; // Specific scam patterns
    
    function killScamPopups() {
        if (isExcludedSite || !aggressiveMode) return;
        
        // Kill specific IDs (note-*, missclick-*)
        document.querySelectorAll('[id^="note-"], [id^="missclick-"]').forEach(el => {
            try {
                reportBlock('popup', 'scam: ' + el.id.substring(0, 20));
                el.remove();
            } catch(e) {}
        });

        // Kill blue bubble scam (rgb(57, 154, 254) + border-radius: 55px)
        document.querySelectorAll('div').forEach(el => {
            try {
                const style = el.getAttribute('style') || '';
                if (style.includes('rgb(57, 154, 254)') && style.includes('border-radius: 55px')) {
                    reportBlock('popup', 'blue bubble');
                    el.remove();
                }
            } catch(e) {}
        });

        // Kill pl- class elements (wo0f-woof pattern)
        document.querySelectorAll('[class*="pl-__"]').forEach(el => {
            try {
                const cls = el.className || '';
                if (cls.includes('pl-') && cls.includes('__')) {
                    reportBlock('popup', 'pl- popup');
                    el.remove();
                }
            } catch(e) {}
        });
    }

    // === GENERIC AD KILLER ===
    function killGenericAds() {
        if (!aggressiveMode) return;
        
        try {
            // Kill ad iframes
            document.querySelectorAll('iframe[src*="doubleclick"], iframe[src*="googlesyndication"], iframe[src*="ads."]').forEach(el => {
                try {
                    reportBlock('ad', 'ad iframe');
                    el.remove();
                } catch(e) {}
            });

            // Kill ad divs with common patterns
            document.querySelectorAll('[id*="google_ads"], [id*="aswift_"], [id*="ad-"], [id*="gpt-ad"]').forEach(el => {
                try {
                    if (el.offsetWidth === 0 || el.offsetHeight === 0) return;
                    reportBlock('ad', 'ad element');
                    el.remove();
                } catch(e) {}
            });
        } catch(e) {}
    }

    // === PUSH NOTIFICATION BLOCKER ===
    if (window.Notification) {
        Notification.requestPermission = function() {
            reportBlock('popup', 'notification');
            return Promise.resolve('denied');
        };
    }

    // Start all killers
    function startKillers() {
        if (!document.body) {
            setTimeout(startKillers, 100);
            return;
        }
        
        setInterval(handleYouTube, 500);
        setInterval(killScamPopups, 2000);
        setInterval(killGenericAds, 1000);
    }
    
    startKillers();

    // === COOKIE CONSENT AUTO-DISMISS ===
    const REJECT_SELECTORS = [
        '[data-action="reject"]', '#onetrust-reject-all-handler', 
        '.cky-btn-reject', '#CybotCookiebotDialogBodyButtonDecline',
        'button[id*="reject" i]', 'button[class*="reject" i]'
    ];

    function dismissCookies() {
        for (const sel of REJECT_SELECTORS) {
            const btn = document.querySelector(sel);
            if (btn && btn.offsetParent !== null) {
                btn.click();
                reportBlock('popup', 'cookie rejected');
                return;
            }
        }
    }

    function startCookieKiller() {
        if (!document.body) {
            setTimeout(startCookieKiller, 200);
            return;
        }
        [500, 1000, 2000, 3000].forEach(t => {
            setTimeout(dismissCookies, t);
        });
    }

    startCookieKiller();

})();
