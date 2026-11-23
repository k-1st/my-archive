(function () {
    "use strict";

    const shell = document.getElementById("app-shell");
    const panel = document.getElementById("wiki-panel");
    const content = document.getElementById("wiki-content");
    const toggle = document.getElementById("wiki-toggle");
    const backdrop = document.getElementById("wiki-backdrop");

    if (!shell || !panel || !content || !toggle) return;

    const mobileQuery = window.matchMedia("(max-width: 900px)");

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function safeUrl(value) {
        try {
            const url = new URL(value, window.location.href);
            return ["http:", "https:"].includes(url.protocol)
                ? url.href
                : "";
        } catch {
            return "";
        }
    }

    async function getJson(path) {
        try {
            const response = await fetch(path, { cache: "no-cache" });
            return response.ok ? await response.json() : {};
        } catch (error) {
            console.warn("Wiki data unavailable:", path, error);
            return {};
        }
    }

    function updateControls() {
        const mobile = mobileQuery.matches;
        const open = mobile
            ? shell.classList.contains("wiki-open")
            : !shell.classList.contains("wiki-collapsed");

        toggle.setAttribute("aria-expanded", String(open));
        panel.setAttribute("aria-hidden", String(!open));
    }

    function openPanel() {
        if (mobileQuery.matches) {
            shell.classList.add("wiki-open");
        } else {
            shell.classList.remove("wiki-collapsed");
        }

        updateControls();
    }

    function closePanel() {
        if (mobileQuery.matches) {
            shell.classList.remove("wiki-open");
        } else {
            shell.classList.add("wiki-collapsed");
        }

        updateControls();
    }

    function togglePanel() {
        const isOpen = mobileQuery.matches
            ? shell.classList.contains("wiki-open")
            : !shell.classList.contains("wiki-collapsed");

        if (isOpen) closePanel();
        else openPanel();
    }

    toggle.addEventListener("click", togglePanel);
    backdrop?.addEventListener("click", closePanel);

    mobileQuery.addEventListener("change", () => {
        shell.classList.remove("wiki-open", "wiki-collapsed");
        updateControls();
    });

    content.addEventListener("click", event => {
        const button = event.target.closest("[data-wiki-route]");
        if (!button || !window.ArchiveApp) return;

        const route = button.dataset.wikiRoute;

        if (route === "home") {
            window.ArchiveApp.home();
        } else {
            window.ArchiveApp.navigate(route);
        }

        if (mobileQuery.matches) closePanel();
    });

    function routeLink(label, route) {
        return `
            <button class="wiki-link"
                    type="button"
                    data-wiki-route="${escapeHTML(route)}">
                ${escapeHTML(label)}
            </button>
        `;
    }

    function externalLink(label, url) {
        const safe = safeUrl(url);
        if (!safe) return "";

        return `
            <a class="wiki-link wiki-external"
               href="${escapeHTML(safe)}"
               target="_blank"
               rel="noopener noreferrer">
                ${escapeHTML(label)} ↗
            </a>
        `;
    }

    function render(aboutData, contactData, searchData) {
        const about = aboutData.about || {};
        const archive = about.archive || {};
        const owner = about.owner || {};
        const organization = about.organization || {};
        const contact = contactData.contact || {};

        const archiveItems = Array.isArray(searchData.items)
            ? searchData.items
            : [];

        const contactOwner = contact.owner || {};
        const ownerName = owner.name || contactOwner.name || "";
        const ownerRole = owner.role || contactOwner.role || "";
        const ownerPhoto = safeUrl(owner.photo || contactOwner.photo || "");
        const archiveImage = safeUrl(archive.image || "");

        const email = Array.isArray(contact.methods)
            ? contact.methods.find(method =>
                method.type === "email" && method.value
            )
            : null;

        const emailLink = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
            ? `<a class="wiki-link wiki-external"
                 href="mailto:${escapeHTML(email.value)}">
                 ${escapeHTML(email.value)}
               </a>`
            : "";

        const total = Number.isFinite(searchData.total)
            ? searchData.total
            : archiveItems.length;

        content.innerHTML = `
            <section class="wiki-block">
                <div class="wiki-identity">
                    ${archiveImage
                        ? `<img src="${escapeHTML(archiveImage)}"
                                alt="${escapeHTML(archive.name || "Archive")}">`
                        : ""}
                    <div>
                        <strong>${escapeHTML(archive.name || "Archive")}</strong>
                        <p>${escapeHTML(archive.type || "Digital collection")}</p>
                    </div>
                </div>
                ${archive.description
                    ? `<p>${escapeHTML(archive.description)}</p>`
                    : ""}
            </section>

            <section class="wiki-block">
                <h3>Archive facts</h3>
                ${archive.established ? `
                    <div class="wiki-stat">
                        <span>Established</span>
                        <strong>${escapeHTML(archive.established)}</strong>
                    </div>
                ` : ""}
                ${archive.status ? `
                    <div class="wiki-stat">
                        <span>Status</span>
                        <strong>${escapeHTML(archive.status)}</strong>
                    </div>
                ` : ""}
                <div class="wiki-stat">
                    <span>Archive items</span>
                    <strong>${total.toLocaleString()}</strong>
                </div>
            </section>

            ${ownerName ? `
                <section class="wiki-block">
                    <h3>Owner</h3>
                    <div class="wiki-identity">
                        ${ownerPhoto
                            ? `<img src="${escapeHTML(ownerPhoto)}"
                                    alt="${escapeHTML(ownerName)}">`
                            : ""}
                        <div>
                            <strong>${escapeHTML(ownerName)}</strong>
                            <p>${escapeHTML(ownerRole)}</p>
                        </div>
                    </div>
                    ${owner.location
                        ? `<p>${escapeHTML(owner.location)}</p>`
                        : ""}
                    ${externalLink("Owner website", owner.website)}
                </section>
            ` : ""}

            ${organization.name ? `
                <section class="wiki-block">
                    <h3>Organization</h3>
                    <strong>${escapeHTML(organization.name)}</strong>
                    <p>${escapeHTML(organization.type)}</p>
                    ${externalLink("Organization website", organization.website)}
                </section>
            ` : ""}

            <section class="wiki-block">
                <h3>Explore</h3>
                ${routeLink("Home", "home")}
                ${routeLink("Search collection", "pages/search.html")}
                ${routeLink("About this archive", "pages/about.html")}
                ${routeLink("Contact information", "pages/contacts.html")}
            </section>

            ${emailLink ? `
                <section class="wiki-block">
                    <h3>Contact</h3>
                    ${emailLink}
                </section>
            ` : ""}

            <section class="wiki-block">
                <h3>GitHub repository</h3>
                ${externalLink("Website repository", "https://github.com/k-1st/my-archive")}
                ${externalLink("Storage repository", "https://github.com/k-1st/my-storage")}
                <p>Repository details and live activity can be added later.</p>
            </section>
        `;
    }

    async function initialize() {
        const [about, contacts, search] = await Promise.all([
            getJson("data/about.json"),
            getJson("data/contacts.json"),
            getJson("data/archive-search.json")
        ]);

        if (!panel.isConnected) return;

        render(about, contacts, search);
    }

    updateControls();
    initialize();
})();
