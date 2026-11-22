import { readFile, writeFile } from "node:fs/promises";

const settingsPath = "data/site.json";
const htmlPath = "index.html";

const defaults = {
    siteName: "My Archive",
    title: "My Archive",
    description: "Your personal collection of archived content, organized in one place.",
    language: "en",
    logo: "",
    favicon: "",
    socialImage: ""
};

function clean(value, fallback = "") {
    return typeof value === "string" && value.trim()
        ? value.trim()
        : fallback;
}

function escapeHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function updateMeta(html, attribute, name, content) {
    const escapedName = escapeRegex(name);

    const pattern = new RegExp(
        `<meta\\b(?=[^>]*\\b${attribute}\\s*=\\s*["']${escapedName}["'])[^>]*>`,
        "i"
    );

    if (!pattern.test(html)) {
        throw new Error(`Missing metadata tag: ${name}`);
    }

    return html.replace(pattern, tag => {
        const contentPattern = /\bcontent\s*=\s*(["']).*?\1/i;

        if (contentPattern.test(tag)) {
            return tag.replace(
                contentPattern,
                `content="${escapeHTML(content)}"`
            );
        }

        return tag.replace(
            /\/?>$/,
            ` content="${escapeHTML(content)}">`
        );
    });
}

function updateFavicon(html, favicon) {
    const pattern =
        /<link\b(?=[^>]*\bid=["']site-favicon["'])[^>]*>/i;

    if (!pattern.test(html)) {
        throw new Error("Missing site-favicon placeholder in index.html");
    }

    return html.replace(pattern, tag => {
        if (!favicon) return "";

        const hrefPattern = /\bhref\s*=\s*(["']).*?\1/i;

        if (hrefPattern.test(tag)) {
            return tag.replace(
                hrefPattern,
                `href="${escapeHTML(favicon)}"`
            );
        }

        return tag.replace(
            /\/?>$/,
            ` href="${escapeHTML(favicon)}">`
        );
    });
}

async function main() {
    let settings = {};

    try {
        const content = await readFile(settingsPath, "utf8");
        settings = JSON.parse(content);
    } catch (error) {
        if (error.code === "ENOENT") {
            console.warn("site.json not found. Using default settings.");
        } else {
            throw error;
        }
    }

    const siteName = clean(settings.siteName, defaults.siteName);
    const title = clean(settings.title, siteName);
    const description = clean(
        settings.description,
        defaults.description
    );

    const requestedLanguage = clean(
        settings.language,
        defaults.language
    );

    const language = /^[a-z]{2,3}(?:-[a-z0-9]+)*$/i.test(requestedLanguage)
        ? requestedLanguage
        : defaults.language;

    const favicon = clean(settings.favicon);
    const socialImage = /^https:\/\//i.test(clean(settings.socialImage))
        ? clean(settings.socialImage)
        : "";

    let html = await readFile(htmlPath, "utf8");

    html = html.replace(
        /<html\b[^>]*>/i,
        tag => {
            if (/\blang\s*=/.test(tag)) {
                return tag.replace(
                    /\blang\s*=\s*(["']).*?\1/i,
                    `lang="${escapeHTML(language)}"`
                );
            }

            return tag.replace(
                />$/,
                ` lang="${escapeHTML(language)}">`
            );
        }
    );

    html = html.replace(
        /<title>[\s\S]*?<\/title>/i,
        `<title>${escapeHTML(title)}</title>`
    );

    html = updateMeta(html, "name", "description", description);
    html = updateMeta(html, "property", "og:site_name", siteName);
    html = updateMeta(html, "property", "og:title", title);
    html = updateMeta(html, "property", "og:description", description);
    html = updateMeta(html, "property", "og:image", socialImage);

    html = updateMeta(
        html,
        "name",
        "twitter:card",
        socialImage ? "summary_large_image" : "summary"
    );

    html = updateMeta(html, "name", "twitter:title", title);
    html = updateMeta(html, "name", "twitter:description", description);
    html = updateMeta(html, "name", "twitter:image", socialImage);

    html = updateFavicon(html, favicon);

    await writeFile(htmlPath, html);

    console.log("Website identity settings applied.");
}

main().catch(error => {
    console.error("Failed to apply site settings:", error);
    process.exit(1);
});
