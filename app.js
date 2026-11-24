const appShell = document.getElementById("app-shell");
const navigation = document.getElementById("navigation");
const headerNavigation = document.getElementById("header-navigation");
const content = document.getElementById("page-content");

const siteNameElement = document.getElementById("site-name");
const footerSiteNameElement = document.getElementById("footer-site-name");

const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");
const moreToggle = document.getElementById("more-toggle");
const moreMenu = document.getElementById("more-menu");
const homeLink = document.getElementById("home-link");

const breadcrumbHome = document.getElementById("breadcrumb-home");
const breadcrumbCurrent = document.getElementById("breadcrumb-current");
const historyBack = document.getElementById("history-back");
const historyForward = document.getElementById("history-forward");

const themeToggle = document.getElementById("theme-toggle");

let siteSettings = {
    siteName: "My Archive",
    title: "My Archive",
    description: "Your personal collection of archived content, organized in one place.",
    language: "en",
    logo: ""
};

let pageItems = [];
let archiveItems = [];
let pageTitleMap = new Map();

let navigationIndex = 0;
let highestNavigationIndex = 0;
let activeRequest = null;
let navigationToken = 0;

const icons = {
    folder: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M1.75 2.5h4.586l1.5 1.5h6.414c.966 0 1.75.784 1.75 1.75v6.5A1.75 1.75 0 0 1 14.25 14h-12.5A1.75 1.75 0 0 1 0 12.25v-8A1.75 1.75 0 0 1 1.75 2.5Z"/>
    </svg>`,

    file: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M3.75 1A1.75 1.75 0 0 0 2 2.75v10.5C2 14.216 2.784 15 3.75 15h8.5A1.75 1.75 0 0 0 14 13.25V5.81a1.75 1.75 0 0 0-.513-1.237L9.427 1.513A1.75 1.75 0 0 0 8.19 1H3.75Zm5 1.5v3a1 1 0 0 0 1 1h3v6.75a.25.25 0 0 1-.25.25h-8.5a.25.25 0 0 1-.25-.25V2.75a.25.25 0 0 1 .25-.25h4.75Z"/>
    </svg>`,

    search: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <circle cx="6.8" cy="6.8" r="4.5"/>
        <path d="m10.2 10.2 3.3 3.3"/>
    </svg>`,

    about: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <circle cx="8" cy="8" r="6.2"/>
        <path d="M8 7v4M8 4.5h.01"/>
    </svg>`,

    contacts: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <circle cx="8" cy="5" r="2.5"/>
        <path d="M2.8 14c.4-2.5 2.3-4 5.2-4s4.8 1.5 5.2 4"/>
    </svg>`
};

document.getElementById("copyright-year").textContent =
    new Date().getFullYear();

/* --------------------------------------------------
   General helpers
-------------------------------------------------- */

function getPageIcon(title) {
    const name = String(title || "").toLowerCase();

    if (name === "search") return icons.search;
    if (name === "about") return icons.about;
    if (name === "contact" || name === "contacts") {
        return icons.contacts;
    }

    return icons.file;
}

function isMobile() {
    return window.matchMedia("(max-width: 700px)").matches;
}

function formatDisplayName(value) {
    return String(value || "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function escapeHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function applySiteSettings(settings) {
    siteSettings = {
        ...siteSettings,
        ...settings
    };

    const siteName = siteSettings.siteName || "My Archive";

    siteNameElement.textContent = siteName;
    siteNameElement.hidden = false;

    footerSiteNameElement.textContent = siteName;

    document.title = siteSettings.title || siteName;

    if (siteSettings.language) {
        document.documentElement.lang = siteSettings.language;
    }

    homeLink.setAttribute(
        "aria-label",
        `Go to ${siteName} home`
    );

    const existingLogo = homeLink.querySelector(".site-logo-image");

    if (existingLogo) {
        existingLogo.remove();
    }

    const logoPath = siteSettings.logo || "";

    if (logoPath) {
        const image = document.createElement("img");

        image.className = "site-logo-image";
        image.alt = siteName;

        image.addEventListener("error", () => {
            image.remove();
            siteNameElement.hidden = false;
        }, { once: true });

        homeLink.insertBefore(image, siteNameElement);
        siteNameElement.hidden = true;

        image.src = logoPath;
    }
}

async function loadSiteSettings() {
    try {
        const response = await fetch("data/site.json", {
            cache: "no-cache"
        });

        if (!response.ok) {
            return;
        }

        const settings = await response.json();

        if (settings && typeof settings === "object") {
            applySiteSettings(settings);
        }

    } catch (error) {
        console.warn("Unable to load site settings:", error);
    }
}

function getPageTitle(file) {
    if (!file) return "";

    if (pageTitleMap.has(file)) {
        return formatDisplayName(pageTitleMap.get(file));
    }

    const filename = file.split("/").pop() || "";

    return formatDisplayName(
        decodeURIComponent(filename).replace(/\.html?$/i, "")
    );
}

function getCurrentFile() {
    return new URL(window.location.href).searchParams.get("page");
}

function makePageUrl(file) {
    const url = new URL(window.location.href);

    if (file) {
        url.searchParams.set("page", file);
    } else {
        url.searchParams.delete("page");
    }

    return url.pathname + url.search + url.hash;
}

function updateHistoryButtons() {
    historyBack.disabled = navigationIndex <= 0;
    historyForward.disabled =
        navigationIndex >= highestNavigationIndex;
}

function updateBreadcrumb(file) {
    breadcrumbCurrent.textContent = getPageTitle(file);
}

function updateActiveNavigation(file) {
    document.querySelectorAll(".nav-link.active, .header-link.active")
        .forEach(element => element.classList.remove("active"));

    if (!file) return;

    document.querySelectorAll("[data-page]").forEach(element => {
        if (element.dataset.page === file) {
            element.classList.add("active");

            // Expand parent folders containing the active item.
            let parent = element.parentElement;

            while (parent) {
                if (parent.classList.contains("tree-children")) {
                    parent.classList.add("open");

                    const folderButton = parent.previousElementSibling;
                    if (folderButton) {
                        folderButton.setAttribute("aria-expanded", "true");
                    }
                }

                parent = parent.parentElement;
            }
        }
    });
}

/* --------------------------------------------------
   Sidebar controls
-------------------------------------------------- */

function toggleSidebar() {
    if (isMobile()) {
        const isOpen = appShell.classList.toggle("sidebar-open");
        sidebarToggle.setAttribute("aria-expanded", String(isOpen));
    } else {
        const isCollapsed =
            appShell.classList.toggle("sidebar-collapsed");

        sidebarToggle.setAttribute(
            "aria-expanded",
            String(!isCollapsed)
        );
    }
}

function closeMobileSidebar() {
    appShell.classList.remove("sidebar-open");
    sidebarToggle.setAttribute("aria-expanded", "false");
}

sidebarToggle.addEventListener("click", toggleSidebar);
sidebarBackdrop.addEventListener("click", closeMobileSidebar);

/* --------------------------------------------------
   More menu
-------------------------------------------------- */

function closeMoreMenu() {
    moreMenu.classList.remove("open");
    moreToggle.setAttribute("aria-expanded", "false");
}

moreToggle.addEventListener("click", event => {
    event.stopPropagation();

    const isOpen = moreMenu.classList.toggle("open");
    moreToggle.setAttribute("aria-expanded", String(isOpen));
});

document.addEventListener("click", event => {
    if (
        !moreMenu.contains(event.target) &&
        !moreToggle.contains(event.target)
    ) {
        closeMoreMenu();
    }
});

document.getElementById("more-home").addEventListener("click", () => {
    navigate(null);
    closeMoreMenu();
});

/* --------------------------------------------------
   Browser history and navigation
-------------------------------------------------- */

function navigate(file, options = {}) {
    const replace = options.replace === true;

    const url = makePageUrl(file);

    if (replace) {
        history.replaceState(
            { archiveIndex: navigationIndex, file },
            "",
            url
        );
    } else {
        navigationIndex++;
        highestNavigationIndex = navigationIndex;

        history.pushState(
            { archiveIndex: navigationIndex, file },
            "",
            url
        );
    }

    updateHistoryButtons();
    displayRoute(file);
}

function goBack() {
    if (navigationIndex > 0) {
        history.back();
    }
}

function goForward() {
    if (navigationIndex < highestNavigationIndex) {
        history.forward();
    }
}

historyBack.addEventListener("click", goBack);
historyForward.addEventListener("click", goForward);

window.addEventListener("popstate", event => {
    if (event.state && Number.isInteger(event.state.archiveIndex)) {
        navigationIndex = event.state.archiveIndex;
    }

    updateHistoryButtons();

    // The URL is the source of truth when navigating Back or Forward.
    displayRoute(getCurrentFile());
});

window.addEventListener("hashchange", () => {
    // Hash links inside archive pages remain native browser links.
});

/* --------------------------------------------------
   Home page
-------------------------------------------------- */
function showHome() {
    loadPage("pages/home.html");
}

homeLink.addEventListener("click", () => navigate(null));
breadcrumbHome.addEventListener("click", () => navigate(null));

/* --------------------------------------------------
   Page navigation
-------------------------------------------------- */

function openPage(item) {
    navigate(item.file);
}

function createPageButton(item, className) {
    const button = document.createElement("button");

    button.className = className;
    button.type = "button";
    button.dataset.page = item.file;

    button.innerHTML =
        `${getPageIcon(item.title)}<span>${formatDisplayName(item.title)}</span>`;

    button.addEventListener("click", () => openPage(item));

    return button;
}

/* --------------------------------------------------
   Header navigation
-------------------------------------------------- */

function renderHeaderNavigation(items) {
    headerNavigation.innerHTML = "";

    items.forEach(item => {
        headerNavigation.appendChild(
            createPageButton(item, "header-link")
        );
    });
}

/* --------------------------------------------------
   Sidebar tree
-------------------------------------------------- */

function renderTree(items, parent) {
    items.forEach(item => {
        const container = document.createElement("div");
        container.className = "nav-item";

        if (item.type === "folder") {
            const link = document.createElement("button");

            link.type = "button";
            link.className = "nav-link folder-link";
            link.innerHTML =
                `${icons.folder}<span>${formatDisplayName(item.title)}</span>`;

            link.setAttribute("aria-expanded", "false");

            const children = document.createElement("div");
            children.className = "tree-children";

            link.addEventListener("click", () => {
                children.classList.toggle("open");

                link.setAttribute(
                    "aria-expanded",
                    String(children.classList.contains("open"))
                );
            });

            container.appendChild(link);
            container.appendChild(children);

            renderTree(item.children || [], children);

        } else if (item.type === "page") {
            pageTitleMap.set(item.file, item.title);

            container.appendChild(
                createPageButton(item, "nav-link")
            );

        } else if (item.type === "file") {
            const link = document.createElement("a");

            link.className = "nav-link";
            link.href = item.file;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.innerHTML =
                `${icons.file}<span>${item.title}</span>`;

            container.appendChild(link);
        }

        parent.appendChild(container);
    });
}

function renderSidebar(items) {
    navigation.innerHTML = "";

    renderTree(items, navigation);
}

/* --------------------------------------------------
   Load page content
-------------------------------------------------- */

async function loadPage(file) {
    const thisRequest = ++navigationToken;

    if (activeRequest) {
        activeRequest.abort();
    }

    const controller = new AbortController();
    activeRequest = controller;

    try {
        content.innerHTML = "<p></p>";

        const response = await fetch(file, {
            signal: controller.signal,
            cache: "no-cache"
        });

        if (!response.ok) {
            throw new Error(`Page not found (${response.status})`);
        }

        const html = await response.text();

        if (thisRequest !== navigationToken) return;

        content.innerHTML = html;

        // Activate scripts included in the loaded HTML.
        const scripts = Array.from(content.querySelectorAll("script"));

        for (const oldScript of scripts) {
            if (thisRequest !== navigationToken) return;

            const newScript = document.createElement("script");

            for (const attribute of oldScript.attributes) {
                newScript.setAttribute(attribute.name, attribute.value);
            }

            if (oldScript.hasAttribute("src")) {
                newScript.src = new URL(
                    oldScript.getAttribute("src"),
                    response.url
                ).href;

                newScript.async = false;

                await new Promise((resolve, reject) => {
                    newScript.onload = resolve;
                    newScript.onerror = reject;
                    oldScript.replaceWith(newScript);
                });

            } else {
                newScript.textContent = oldScript.textContent;
                oldScript.replaceWith(newScript);
            }
        }

        if (thisRequest !== navigationToken) return;

        content.scrollTop = 0;

    } catch (error) {
        if (error.name === "AbortError") return;

        if (thisRequest !== navigationToken) return;

        console.error("Page loading error:", error);

        content.innerHTML = `
            <h2>Unable to load page</h2>
            <p>Please check the page address or try again.</p>
        `;
    }
}

/* --------------------------------------------------
   Central route display
-------------------------------------------------- */

function displayRoute(file) {
    updateActiveNavigation(file);
    updateBreadcrumb(file);

    closeMobileSidebar();
    closeMoreMenu();

    if (!file) {
        // Cancel a page request if the user returns Home.
        navigationToken++;

        if (activeRequest) {
            activeRequest.abort();
            activeRequest = null;
        }

        showHome();
        return;
    }

    loadPage(file);
}

/*
 * Public navigation API.
 * Search results and other page scripts can use this.
 */
window.ArchiveApp = {
    navigate(file, options = {}) {
        navigate(file, options);
    },

    home() {
        navigate(null);
    },

    getCurrentPage() {
        return getCurrentFile();
    }
};

/*
 * Keep compatibility with the existing Search page.
 */
window.loadArchivePage = function(file) {
    navigate(file);
};

/* --------------------------------------------------
   Initialize navigation data and restore current page
-------------------------------------------------- */

async function initialize() {
    try {
        const siteSettingsPromise = loadSiteSettings();

        const [pagesResponse, archiveResponse] = await Promise.all([
            fetch("data/pages.json", { cache: "no-cache" }),
            fetch("data/archive-index.json", { cache: "no-cache" })
        ]);

        await siteSettingsPromise;

        if (!pagesResponse.ok || !archiveResponse.ok) {
            throw new Error("Unable to load navigation data");
        }

        const pagesData = await pagesResponse.json();
        const archiveData = await archiveResponse.json();

        archiveItems = archiveData.navigation || [];

        pageItems = pagesData.navigation.filter(
            item => item.type === "page"
        );

        // Build title lookup for breadcrumb labels.
        pageTitleMap.clear();

        function collectTitles(items) {
            items.forEach(item => {
                if (item.type === "page" && item.file) {
                    pageTitleMap.set(item.file, item.title);
                }

                if (item.type === "folder") {
                    collectTitles(item.children || []);
                }
            });
        }

        collectTitles(pageItems);
        collectTitles(archiveData.navigation || []);

        renderHeaderNavigation(pageItems);

        const sidebarItems = [
            ...pageItems,
            {
                title: "Archive",
                type: "folder",
                children: archiveData.navigation || []
            }
        ];

        renderSidebar(sidebarItems);

        // Establish the first history entry without adding a new one.
        const initialFile = getCurrentFile();

        navigationIndex = 0;
        highestNavigationIndex = 0;

        history.replaceState(
            { archiveIndex: 0, file: initialFile },
            "",
            makePageUrl(initialFile)
        );

        updateHistoryButtons();

        // Restore the requested page, or show Home.
        displayRoute(initialFile);

    } catch (error) {
        console.error("Initialization error:", error);

        navigation.innerHTML = "Unable to load navigation.";
        headerNavigation.innerHTML = "";

        content.innerHTML = `
            <h2>Archive could not be initialized</h2>
            <p>Please refresh the page and try again.</p>
        `;
    }
}

/* --------------------------------------------------
   Theme management
-------------------------------------------------- */

function getPreferredTheme() {
    const savedTheme = localStorage.getItem("archive-theme");

    if (savedTheme) {
        return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

function applyTheme(theme, save = false) {
    document.documentElement.dataset.theme = theme;

    themeToggle.textContent =
        theme === "dark" ? "Light mode" : "Dark mode";

    if (save) {
        localStorage.setItem("archive-theme", theme);
    }
}

applyTheme(getPreferredTheme());

themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.dataset.theme;
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    applyTheme(newTheme, true);
});

/* --------------------------------------------------
   Start application
-------------------------------------------------- */

initialize();

