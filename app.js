const appShell = document.getElementById("app-shell");
const navigation = document.getElementById("navigation");
const headerNavigation = document.getElementById("header-navigation");
const content = document.getElementById("page-content");

const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");
const moreToggle = document.getElementById("more-toggle");
const moreMenu = document.getElementById("more-menu");
const homeLink = document.getElementById("home-link");

let pageItems = [];

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

document.getElementById("copyright-year").textContent = new Date().getFullYear();

function getPageIcon(title) {
    const name = title.toLowerCase();

    if (name === "search") return icons.search;
    if (name === "about") return icons.about;
    if (name === "contact" || name === "contacts") return icons.contacts;

    return icons.file;
}

function isMobile() {
    return window.matchMedia("(max-width: 700px)").matches;
}

/* Sidebar controls */

function toggleSidebar() {
    if (isMobile()) {
        const isOpen = appShell.classList.toggle("sidebar-open");
        sidebarToggle.setAttribute("aria-expanded", String(isOpen));
    } else {
        const isCollapsed = appShell.classList.toggle("sidebar-collapsed");
        sidebarToggle.setAttribute("aria-expanded", String(!isCollapsed));
    }
}

function closeMobileSidebar() {
    appShell.classList.remove("sidebar-open");
    sidebarToggle.setAttribute("aria-expanded", "false");
}

sidebarToggle.addEventListener("click", toggleSidebar);
sidebarBackdrop.addEventListener("click", closeMobileSidebar);

/* More menu */

moreToggle.addEventListener("click", event => {
    event.stopPropagation();

    const isOpen = moreMenu.classList.toggle("open");
    moreToggle.setAttribute("aria-expanded", String(isOpen));
});

document.addEventListener("click", event => {
    if (!moreMenu.contains(event.target) && !moreToggle.contains(event.target)) {
        moreMenu.classList.remove("open");
        moreToggle.setAttribute("aria-expanded", "false");
    }
});

function closeMoreMenu() {
    moreMenu.classList.remove("open");
    moreToggle.setAttribute("aria-expanded", "false");
}

document.getElementById("more-home").addEventListener("click", () => {
    showHome();
    closeMoreMenu();
});

document.getElementById("more-sidebar").addEventListener("click", () => {
    toggleSidebar();
    closeMoreMenu();
});

/* Home page */

function showHome() {
    document.querySelectorAll(".nav-link.active, .header-link.active")
        .forEach(element => element.classList.remove("active"));

    content.innerHTML = `
        <section class="home-page">
            <h1>Welcome to My Archive</h1>
            <p>Your personal collection of archived content, organized in one place.</p>

            <div class="home-section">
                <h2>Featured</h2>
                <p>Featured archive content will appear here.</p>
            </div>

            <div class="home-section">
                <h2>Recently added</h2>
                <p>Your latest additions will appear here.</p>
            </div>
        </section>
    `;

    content.scrollTop = 0;
    closeMobileSidebar();
}

homeLink.addEventListener("click", showHome);

/* Page navigation */

function openPage(item) {
    document.querySelectorAll(".nav-link.active, .header-link.active")
        .forEach(element => element.classList.remove("active"));

    document.querySelectorAll(`[data-page="${item.file}"]`)
        .forEach(element => element.classList.add("active"));

    loadPage(item.file);
    closeMobileSidebar();
    closeMoreMenu();
}

function createPageButton(item, className) {
    const button = document.createElement("button");
    button.className = className;
    button.type = "button";
    button.dataset.page = item.file;

    button.innerHTML = `${getPageIcon(item.title)}<span>${item.title}</span>`;

    button.addEventListener("click", () => openPage(item));

    return button;
}

/* Header navigation */

function renderHeaderNavigation(items) {
    headerNavigation.innerHTML = "";

    items.forEach(item => {
        headerNavigation.appendChild(
            createPageButton(item, "header-link")
        );
    });
}

/* Sidebar navigation */

function renderTree(items, parent) {
    items.forEach(item => {
        const container = document.createElement("div");
        container.className = "nav-item";

        if (item.type === "folder") {
            const link = document.createElement("button");
            link.type = "button";
            link.className = "nav-link folder-link";
            link.innerHTML = `${icons.folder}<span>${item.title}</span>`;

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
            container.appendChild(
                createPageButton(item, "nav-link")
            );

        } else if (item.type === "file") {
            const link = document.createElement("a");
            link.className = "nav-link";
            link.href = item.file;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.innerHTML = `${icons.file}<span>${item.title}</span>`;

            container.appendChild(link);
        }

        parent.appendChild(container);
    });
}

function renderSidebar(items) {
    navigation.innerHTML = "";

    const pageSection = document.createElement("div");
    renderTree(items, pageSection);
    navigation.appendChild(pageSection);

    const divider = document.createElement("div");
    divider.className = "nav-section-label";
    divider.textContent = "Archive";
    navigation.appendChild(divider);
}

/* Load page content */

async function loadPage(file) {
    try {
        content.innerHTML = "<p>Loading...</p>";

        const response = await fetch(file);

        if (!response.ok) {
            throw new Error("Page not found");
        }

        const html = await response.text();

        content.innerHTML = html;

        // Activate scripts included in the loaded HTML.
        const scripts = Array.from(content.querySelectorAll("script"));

        for (const oldScript of scripts) {
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
            } else {
                newScript.textContent = oldScript.textContent;
            }

            oldScript.replaceWith(newScript);
        }

        content.scrollTop = 0;

    } catch (error) {
        console.error(error);
        content.innerHTML =
            "<h2>Unable to load page</h2><p>Please try again.</p>";
    }
}

window.loadArchivePage = function(file) {
    loadPage(file);
    closeMobileSidebar();
    closeMoreMenu();
};

/* Initialize */

async function initialize() {
    try {
        const [pagesResponse, archiveResponse] = await Promise.all([
            fetch("data/pages.json"),
            fetch("data/archive-index.json")
        ]);

        if (!pagesResponse.ok || !archiveResponse.ok) {
            throw new Error("Unable to load navigation data");
        }

        const pagesData = await pagesResponse.json();
        const archiveData = await archiveResponse.json();

        pageItems = pagesData.navigation.filter(
            item => item.type === "page"
        );

        renderHeaderNavigation(pageItems);

        const sidebarItems = [
            ...pageItems,
            {
                title: "Archive",
                type: "folder",
                children: archiveData.navigation
            }
        ];

        renderTree(sidebarItems, navigation);

    } catch (error) {
        console.error(error);
        navigation.innerHTML = "Unable to load navigation.";
        headerNavigation.innerHTML = "";
    }
}

/* Theme management */

const themeToggle = document.getElementById("theme-toggle");

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

initialize();
