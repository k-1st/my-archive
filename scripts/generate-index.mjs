import {
    readdir,
    mkdir,
    writeFile,
    readFile,
    access
} from "node:fs/promises";

import path from "node:path";

const archiveRoot = path.resolve("archive");
const metadataRoot = path.resolve("storage-data/archive");

const indexOutput = path.resolve("data/archive-index.json");
const searchOutput = path.resolve("data/archive-search.json");

const ignoredFiles = new Set([
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",
    ".gitkeep",
    "README.md"
]);

function encodeArchivePath(relativePath) {
    return "archive/" +
        relativePath
            .split("/")
            .map(encodeURIComponent)
            .join("/");
}

function cleanString(value) {
    return typeof value === "string" ? value.trim() : "";
}

function cleanStringArray(value) {
    if (!Array.isArray(value)) return [];

    return value.filter(
        item => typeof item === "string"
    );
}

async function readMetadata(relativePath) {
    const metadataPath = path.join(
        metadataRoot,
        relativePath.replace(/\.(html|htm)$/i, ".json")
    );

    try {
        await access(metadataPath);
    } catch {
        console.warn(
            `Metadata not found for ${relativePath}. Using filename as title.`
        );

        return {};
    }

    const content = await readFile(metadataPath, "utf8");

    try {
        return JSON.parse(content);
    } catch (error) {
        throw new Error(
            `Invalid JSON metadata: ${metadataPath}\n${error.message}`
        );
    }
}

async function scanDirectory(directory, relativePath = "") {
    const entries = await readdir(directory, {
        withFileTypes: true
    });

    entries.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: "base"
        })
    );

    const items = [];

    for (const entry of entries) {
        if (
            entry.name.startsWith(".") ||
            ignoredFiles.has(entry.name)
        ) {
            continue;
        }

        const fullPath = path.join(directory, entry.name);

        const itemPath = relativePath
            ? `${relativePath}/${entry.name}`
            : entry.name;

        if (entry.isDirectory()) {
            const children = await scanDirectory(
                fullPath,
                itemPath
            );

            if (children.length > 0) {
                items.push({
                    title: entry.name,
                    type: "folder",
                    children
                });
            }
        } else if (entry.isFile()) {
            const extension = path.extname(entry.name).toLowerCase();

            const file = encodeArchivePath(itemPath);

            if (extension === ".html" || extension === ".htm") {
                const metadata = await readMetadata(itemPath);

                const filename = entry.name.replace(/\.html?$/i, "");

                const title =
                    cleanString(metadata.title) || filename;

                const date = cleanString(metadata.date);

                const validDate =
                    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
                    !Number.isNaN(Date.parse(date));

                const folder = path.posix.dirname(itemPath);

                const searchItem = {
                    title,
                    date: validDate ? date : "",
                    description: cleanString(metadata.description),
                    tags: cleanStringArray(metadata.tags),
                    keywords: cleanStringArray(metadata.keywords),
                    searchText: cleanString(metadata.searchText),
                    featured: metadata.featured === true,
                    thumbnail: cleanString(metadata.thumbnail),
                    folder: folder === "." ? "" : folder,
                    filename,
                    file
                };

                searchItems.push(searchItem);

                items.push({
                    title: filename,
                    type: "page",
                    file
                });
            } else {
                items.push({
                    title: entry.name,
                    type: "file",
                    file
                });
            }
        }
    }

    return items;
}

const searchItems = [];

async function generateIndexes() {
    const navigation = await scanDirectory(archiveRoot);

    await mkdir("data", { recursive: true });

    const index = {
        generatedAt: new Date().toISOString(),
        navigation
    };

    await writeFile(
        indexOutput,
        JSON.stringify(index, null, 2) + "\n"
    );

    searchItems.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, {
            numeric: true,
            sensitivity: "base"
        })
    );

    const searchIndex = {
        generatedAt: new Date().toISOString(),
        total: searchItems.length,
        items: searchItems
    };

    await writeFile(
        searchOutput,
        JSON.stringify(searchIndex, null, 2) + "\n"
    );

    console.log("Archive navigation index generated.");
    console.log(
        `Archive search index generated: ${searchItems.length} items.`
    );
}

generateIndexes().catch(error => {
    console.error("Failed to generate archive indexes:", error);
    process.exit(1);
});
