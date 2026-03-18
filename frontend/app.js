/* =========================================================
   Simple Blog — lightweight client-side behavior
   - Theme toggle (persisted)
   - Mobile menu toggle
   - Hash routing between feed and post view
   - Basic search/filter UX for the feed cards
   ========================================================= */

(function () {
    "use strict";

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    const STORAGE_THEME_KEY = "sb:theme"; // "light" | "dark"
    const STORAGE_MENU_KEY = "sb:menuOpen"; // "1" | "0"

    const els = {
        year: null,
        themeToggle: null,
        menuToggle: null,
        mobileNav: null,
        searchForm: null,
        searchInput: null,
        tabs: null,
        sort: null,

        postGrid: null,
        postCards: null,
        postView: null,

        copyLink: null,
        sharePost: null,

        // Post view fields
        postKicker: null,
        postTitle: null,
        postSubtitle: null,
        postAuthor: null,
        postDate: null,
        postReadTime: null,
        postTags: null,
        postBody: null,
        relatedList: null,
    };

    function initElements() {
        els.year = $("#year");
        els.themeToggle = $("#themeToggle");
        els.menuToggle = $("#menuToggle");
        els.mobileNav = $("#mobileNav");
        els.searchForm = $(".search");
        els.searchInput = $("#q");
        els.tabs = $(".tabs");
        els.sort = $("#sort");

        els.postGrid = $(".post-grid");
        els.postCards = $$(".post-card");
        els.postView = $("#postView");

        els.copyLink = $("#copyLink");
        els.sharePost = $("#sharePost");

        els.postKicker = $("#postKicker");
        els.postTitle = $("#postTitle");
        els.postSubtitle = $("#postSubtitle");
        els.postAuthor = $("#postAuthor");
        els.postDate = $("#postDate");
        els.postReadTime = $("#postReadTime");
        els.postTags = $("#postTags");
        els.postBody = $("#postBody");
        els.relatedList = $("#relatedList");
    }

    function setYear() {
        if (!els.year) return;
        els.year.textContent = String(new Date().getFullYear());
    }

    /* ---------------- Theme ---------------- */

    function applyTheme(theme) {
        const root = document.documentElement;
        if (theme === "dark") {
            root.setAttribute("data-theme", "dark");
        } else {
            root.removeAttribute("data-theme");
        }
    }

    function getPreferredTheme() {
        const stored = localStorage.getItem(STORAGE_THEME_KEY);
        if (stored === "dark" || stored === "light") return stored;

        // System preference fallback
        const prefersDark =
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches;
        return prefersDark ? "dark" : "light";
    }

    function toggleTheme() {
        const current =
            document.documentElement.getAttribute("data-theme") === "dark"
                ? "dark"
                : "light";
        const next = current === "dark" ? "light" : "dark";
        applyTheme(next);
        localStorage.setItem(STORAGE_THEME_KEY, next);
    }

    /* ---------------- Mobile menu ---------------- */

    function setMenuOpen(open) {
        if (!els.mobileNav || !els.menuToggle) return;

        const isOpen = Boolean(open);
        els.mobileNav.hidden = !isOpen;
        els.menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        localStorage.setItem(STORAGE_MENU_KEY, isOpen ? "1" : "0");
    }

    function toggleMenu() {
        const expanded =
            els.menuToggle?.getAttribute("aria-expanded") === "true";
        setMenuOpen(!expanded);
    }

    function closeMenuOnNavClick() {
        if (!els.mobileNav) return;
        els.mobileNav.addEventListener("click", (e) => {
            const a =
                e.target && e.target.closest ? e.target.closest("a") : null;
            if (a) setMenuOpen(false);
        });
    }

    /* ---------------- Feed: search/filter UX ---------------- */

    function normalizeText(s) {
        return String(s || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
    }

    function getCardModel(card) {
        const title = $(".post-card-title", card)?.textContent || "";
        const excerpt = $(".post-card-excerpt", card)?.textContent || "";
        const badge = $(".badge", card)?.textContent || "";
        const timeText = $("time", card)?.getAttribute("datetime") || "";
        const readTime = $(".post-card-footer .muted", card)?.textContent || "";

        return {
            id: card.getAttribute("data-post-id") || "",
            title,
            excerpt,
            badge,
            datetime: timeText,
            readTime,
            haystack: normalizeText([title, excerpt, badge].join(" ")),
        };
    }

    let feedModels = [];

    function rebuildFeedModels() {
        els.postCards = $$(".post-card");
        feedModels = els.postCards.map((c) => ({
            card: c,
            ...getCardModel(c),
        }));
    }

    function applyFeedFilter() {
        if (!els.searchInput) return;

        const q = normalizeText(els.searchInput.value);
        const activeTab =
            $(".tab.is-active", els.tabs)?.getAttribute("data-tab") || "latest";

        for (const m of feedModels) {
            // Tab filter: lightweight placeholder logic
            // - "latest": show all
            // - "popular": bias towards shorter read / earlier ids (demo)
            // - "topics": only show cards with a badge
            let tabOk = true;
            if (activeTab === "popular") {
                tabOk = Boolean(m.readTime) && /min read/i.test(m.readTime);
            } else if (activeTab === "topics") {
                tabOk = Boolean(m.badge);
            }

            const qOk = !q || m.haystack.includes(q);

            m.card.style.display = tabOk && qOk ? "" : "none";
        }
    }

    function wireSearch() {
        if (!els.searchForm || !els.searchInput) return;

        els.searchForm.addEventListener("submit", (e) => {
            e.preventDefault();
            applyFeedFilter();
        });

        // Live filtering for better UX
        els.searchInput.addEventListener("input", () => {
            applyFeedFilter();
        });
    }

    function wireTabs() {
        if (!els.tabs) return;

        els.tabs.addEventListener("click", (e) => {
            const btn =
                e.target && e.target.closest ? e.target.closest(".tab") : null;
            if (!btn) return;

            $$(".tab", els.tabs).forEach((t) => {
                t.classList.remove("is-active");
                t.setAttribute("aria-selected", "false");
            });

            btn.classList.add("is-active");
            btn.setAttribute("aria-selected", "true");

            applyFeedFilter();
        });
    }

    function wireSort() {
        if (!els.sort || !els.postGrid) return;

        els.sort.addEventListener("change", () => {
            const mode = els.sort.value;

            // Only sort visible cards for a predictable UI
            const visible = feedModels.filter(
                (m) => m.card.style.display !== "none",
            );

            const getMinutes = (readTime) => {
                const m = String(readTime || "").match(/(\d+)\s*min/i);
                return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
            };

            visible.sort((a, b) => {
                if (mode === "old") {
                    return String(a.datetime).localeCompare(String(b.datetime));
                }
                if (mode === "read") {
                    return getMinutes(a.readTime) - getMinutes(b.readTime);
                }
                // default "new"
                return String(b.datetime).localeCompare(String(a.datetime));
            });

            // Re-append in sorted order
            for (const m of visible) {
                els.postGrid.appendChild(m.card);
            }
        });
    }

    /* ---------------- Routing ---------------- */

    function parseRoute(hash) {
        const raw = String(hash || "").replace(/^#/, "");
        const path = raw.startsWith("/") ? raw : "/" + raw;
        const parts = path.split("/").filter(Boolean);

        // Supported:
        // - #/           => feed
        // - #/post/:id   => post view
        // - others       => feed
        if (parts.length === 0) return { name: "feed" };
        if (parts[0] === "post" && parts[1])
            return { name: "post", id: parts[1] };
        return { name: "feed" };
    }

    function showFeed() {
        if (els.postView) els.postView.hidden = true;
        if (els.postGrid) els.postGrid.hidden = false;

        // scroll to top of main content
        const main = $("#main");
        if (main) main.scrollIntoView({ block: "start" });
    }

    function showPostView() {
        if (els.postGrid) els.postGrid.hidden = true;
        if (els.postView) els.postView.hidden = false;

        const main = $("#main");
        if (main) main.scrollIntoView({ block: "start" });
    }

    function renderPostFromCard(id) {
        // Try to find matching card; fall back to generic
        const m = feedModels.find((x) => x.id === String(id));
        const title = m?.title || "Post";
        const subtitle =
            m?.excerpt ||
            "This is a placeholder post view. Connect your backend and render real content here.";
        const kicker = m?.badge || "Blog";

        if (els.postKicker) els.postKicker.textContent = kicker;
        if (els.postTitle) els.postTitle.textContent = title;
        if (els.postSubtitle) els.postSubtitle.textContent = subtitle;

        if (els.postAuthor) els.postAuthor.textContent = "Simple Blog";
        if (els.postReadTime)
            els.postReadTime.textContent = m?.readTime || "6 min read";

        if (els.postDate) {
            const dt = m?.datetime || new Date().toISOString().slice(0, 10);
            els.postDate.setAttribute("datetime", dt);
            // Keep a human string simple
            els.postDate.textContent = dt;
        }

        if (els.postTags) {
            els.postTags.innerHTML = "";
            const tags = [kicker, "Frontend"];
            for (const t of tags) {
                const span = document.createElement("span");
                span.className = "badge";
                span.textContent = t;
                els.postTags.appendChild(span);
            }
        }

        if (els.postBody) {
            // Keep the existing sample content but adjust the first paragraph
            const firstP = els.postBody.querySelector("p");
            if (firstP) {
                firstP.textContent =
                    "This post content is currently a UI shell. Wire this section to your API/markdown renderer to display full articles.";
            }
        }

        // Related: lightweight demo links
        if (els.relatedList) {
            const related = feedModels
                .filter((x) => x.id !== String(id))
                .slice(0, 2);

            if (related.length) {
                els.relatedList.innerHTML = "";
                for (const r of related) {
                    const a = document.createElement("a");
                    a.className = "related-item";
                    a.href = `#/post/${encodeURIComponent(r.id)}`;

                    const titleEl = document.createElement("span");
                    titleEl.className = "related-title";
                    titleEl.textContent = r.title || "Related post";

                    const metaEl = document.createElement("span");
                    metaEl.className = "muted";
                    metaEl.textContent = r.readTime || "";

                    a.appendChild(titleEl);
                    a.appendChild(metaEl);
                    els.relatedList.appendChild(a);
                }
            }
        }
    }

    function onRouteChange() {
        closeMenuIfMobile();

        const route = parseRoute(location.hash);

        if (route.name === "post") {
            renderPostFromCard(route.id);
            showPostView();
            return;
        }

        showFeed();
    }

    function closeMenuIfMobile() {
        // Close if currently open; keeps navigation clean after selecting a route
        if (!els.menuToggle) return;
        const expanded =
            els.menuToggle.getAttribute("aria-expanded") === "true";
        if (expanded) setMenuOpen(false);
    }

    /* ---------------- Share / Copy ---------------- */

    async function copyCurrentLink() {
        const url = location.href;
        try {
            await navigator.clipboard.writeText(url);
            // Optional: minimal feedback without new UI elements
            if (els.copyLink) {
                const old = els.copyLink.textContent;
                els.copyLink.textContent = "Copied";
                setTimeout(() => {
                    els.copyLink.textContent = old;
                }, 900);
            }
        } catch {
            // Fallback: prompt
            window.prompt("Copy this link:", url);
        }
    }

    async function shareCurrentLink() {
        const url = location.href;
        const title = els.postTitle?.textContent || document.title;

        if (navigator.share) {
            try {
                await navigator.share({ title, url });
                return;
            } catch {
                // user cancelled or share failed; fall through to copy
            }
        }
        await copyCurrentLink();
    }

    /* ---------------- Init ---------------- */

    function wireEvents() {
        els.themeToggle?.addEventListener("click", toggleTheme);

        els.menuToggle?.addEventListener("click", toggleMenu);

        // Close the mobile menu when pressing Escape
        document.addEventListener("keydown", (e) => {
            if (e.key !== "Escape") return;
            setMenuOpen(false);
        });

        closeMenuOnNavClick();

        wireSearch();
        wireTabs();
        wireSort();

        els.copyLink?.addEventListener("click", copyCurrentLink);
        els.sharePost?.addEventListener("click", shareCurrentLink);

        window.addEventListener("hashchange", onRouteChange);

        // Intercept in-feed card clicks to ensure routing works even if links are changed later
        document.addEventListener("click", (e) => {
            const a =
                e.target && e.target.closest
                    ? e.target.closest('a[href^="#/post/"]')
                    : null;
            if (!a) return;
            // Let the hash change drive rendering
        });
    }

    function init() {
        initElements();
        setYear();

        applyTheme(getPreferredTheme());

        // Restore menu open state only if you want it; usually better to start closed.
        // We'll keep it closed to avoid surprising UX on reload.
        setMenuOpen(false);

        rebuildFeedModels();
        applyFeedFilter();
        wireEvents();

        onRouteChange();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
