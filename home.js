(function () {
    "use strict";

    const root = document.getElementById("archive-home");
    if (!root) return;

    const getJson = async path => {
        try {
            const response = await fetch(path, { cache: "no-cache" });
            if (!response.ok) return {};
            return await response.json();
        } catch (error) {
            console.warn("Homepage data unavailable:", path, error);
            return {};
        }
    };

    const esc = value => String(value || "").replace(
        /[&<>"']/g,
        char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]
    );

    const image = (url, alt) => {
        if (!url) return "";

        let safeUrl;

        try {
            safeUrl = new URL(url, window.location.href);
            if (!["http:", "https:"].includes(safeUrl.protocol)) return "";
        } catch {
            return "";
        }

        return `<img src="${esc(safeUrl.href)}" alt="${esc(alt)}" loading="lazy">`;
    };

    async function render() {
        const [index, search, aboutData, contactData] = await Promise.all([
            getJson("data/index.json"),
            getJson("data/archive-search.json"),
            getJson("data/about.json"),
            getJson("data/contacts.json")
        ]);

        if (!root.isConnected) return;

        const home = index.home || {};
        const welcome = home.welcome || {};
        const archive = aboutData.about?.archive || {};
        const owner = aboutData.about?.owner || {};
        const contact = contactData.contact || {};

        const items = Array.isArray(search.items)
            ? search.items.filter(item =>
                item && typeof item.file === "string" &&
                item.file.startsWith("archive/")
            )
            : [];

        const featured = items.filter(item => item.featured === true);

        const recent = [...items]
            .filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item.date || ""))
            .sort((a, b) => b.date.localeCompare(a.date));

        const card = item => `
            <article class="home-card">
                ${image(item.thumbnail, item.title)}
                <h3>${esc(item.title)}</h3>
                <p>${esc(item.date)}</p>
                <p>${esc(item.description)}</p>
                <button type="button" data-file="${esc(item.file)}">
                    Open item
                </button>
            </article>
        `;

        const section = (settings, fallback, items) => {
            if (settings.enabled === false || !items.length) return "";

            return `
                <section class="home-section">
                    <h2>${esc(settings.heading || fallback)}</h2>
                    <p>${esc(settings.description)}</p>
                    <div class="home-grid">
                        ${items.map(card).join("")}
                    </div>
                </section>
            `;
        };

        const email = (contact.methods || []).find(method =>
            method.type === "email" && method.value
        );

        root.innerHTML = `
            ${welcome.enabled !== false ? `
                <section class="home-hero">
                    <div>
                        <h1>${esc(welcome.heading || "Welcome to the Archive")}</h1>
                        <h3>${esc(welcome.subtitle)}</h3>
                        <p>${esc(welcome.description)}</p>
                        <button type="button" data-action="explore">
                            ${esc(welcome.primaryButton?.label || "Explore the Archive")}
                        </button>
                        <button type="button" data-action="search">
                            ${esc(welcome.secondaryButton?.label || "Search Collection")}
                        </button>
                    </div>
                    <div>
                        ${image(welcome.image, welcome.heading || "Archive")}
                    </div>
                </section>
            ` : ""}

            ${section(home.featured || {}, "Featured Collection",
                featured.slice(0, Number(home.featured?.limit) || 4))}

            ${section(home.recent || {}, "Recently Added",
                recent.slice(0, Number(home.recent?.limit) || 5))}

            ${home.about?.enabled !== false ? `
                <section class="home-section">
                    <h2>${esc(home.about?.heading || "About This Archive")}</h2>
                    ${image(archive.image, archive.name || "Archive")}
                    <h3>${esc(archive.name)}</h3>
                    <p>${esc(archive.description)}</p>
                    ${owner.name ? `<p><strong>${esc(owner.name)}</strong> — ${esc(owner.role)}</p>` : ""}
                    <button type="button" data-action="about">Learn More</button>
                </section>
            ` : ""}

            ${home.contact?.enabled !== false && contact.enabled !== false ? `
                <section class="home-section">
                    <h2>${esc(home.contact?.heading || contact.heading || "Get in Touch")}</h2>
                    <p>${esc(home.contact?.description || contact.intro)}</p>
                    ${contact.owner?.name ? `<p>${esc(contact.owner.name)}</p>` : ""}
                    ${email ? `<p>Email: ${esc(email.value)}</p>` : ""}
                    <button type="button" data-action="contacts">Contact Us</button>
                </section>
            ` : ""}
        `;
    }

    root.addEventListener("click", event => {
        const fileButton = event.target.closest("[data-file]");

        if (fileButton) {
            window.ArchiveApp.navigate(fileButton.dataset.file);
            return;
        }

        const actionButton = event.target.closest("[data-action]");
        if (!actionButton) return;

        const action = actionButton.dataset.action;

        if (action === "explore") {
            getJson("data/archive-search.json").then(data => {
                const first = data.items?.find(item =>
                    item.file?.startsWith("archive/")
                );
                if (first) window.ArchiveApp.navigate(first.file);
            });
        }

        if (action === "search") {
            window.ArchiveApp.navigate("pages/search.html");
        }

        if (action === "about") {
            window.ArchiveApp.navigate("pages/about.html");
        }

        if (action === "contacts") {
            window.ArchiveApp.navigate("pages/contacts.html");
        }
    });

    render();
})();
