const navigation = document.getElementById("navigation");
const content = document.getElementById("page-content");

const icons = {
    folder: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M1.75 2.5h4.586l1.5 1.5h6.414c.966 0 1.75.784 1.75 1.75v6.5A1.75 1.75 0 0 1 14.25 14h-12.5A1.75 1.75 0 0 1 0 12.25v-8A1.75 1.75 0 0 1 1.75 2.5Z"/>
    </svg>`,

    file: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M3.75 1A1.75 1.75 0 0 0 2 2.75v10.5C2 14.216 2.784 15 3.75 15h8.5A1.75 1.75 0 0 0 14 13.25V5.81a1.75 1.75 0 0 0-.513-1.237L9.427 1.513A1.75 1.75 0 0 0 8.19 1H3.75Zm5 1.5v3a1 1 0 0 0 1 1h3v6.75a.25.25 0 0 1-.25.25h-8.5a.25.25 0 0 1-.25-.25V2.75a.25.25 0 0 1 .25-.25h4.75Z"/>
    </svg>`
};

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

        // Remove the old manually maintained Archive entry.
        const staticPages = pagesData.navigation.filter(
            item => !(item.type === "folder" && item.title === "Archive")
        );

        // Add the automatically generated archive.
        staticPages.push({
            title: "Archive",
            type: "folder",
            children: archiveData.navigation
        });

        renderTree(staticPages, navigation);

    } catch (error) {
        console.error(error);
        navigation.innerHTML = "Unable to load navigation.";
    }
}

function renderTree(items, parent) {
    items.forEach(item => {
        const container = document.createElement("div");
        container.className = "nav-item";

        const link = document.createElement("a");
        link.className = "nav-link";

        if (item.type === "folder") {
            link.href = "#";
            link.innerHTML = icons.folder + " " + item.title;

            const children = document.createElement("div");
            children.className = "tree-children";

            link.addEventListener("click", event => {
                event.preventDefault();
                children.classList.toggle("open");
            });

            container.appendChild(link);
            container.appendChild(children);

            renderTree(item.children || [], children);

        } else if (item.type === "page") {
            link.href = "#";
            link.innerHTML = icons.file + " " + item.title;

            link.addEventListener("click", event => {
                event.preventDefault();

                document.querySelectorAll(".nav-link.active")
                    .forEach(element => element.classList.remove("active"));

                link.classList.add("active");

                loadPage(item.file);
            });

            container.appendChild(link);

        } else if (item.type === "file") {
            link.href = item.file;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.innerHTML = icons.file + " " + item.title;

            container.appendChild(link);
        }

        parent.appendChild(container);
    });
}

async function loadPage(file) {
    try {
        content.innerHTML = "Loading...";

        const response = await fetch(file);

        if (!response.ok) {
            throw new Error("Page not found");
        }

        const html = await response.text();
        content.innerHTML = html;

    } catch (error) {
        content.innerHTML = "<h2>Unable to load page</h2>";
        console.error(error);
    }
}

initialize();
