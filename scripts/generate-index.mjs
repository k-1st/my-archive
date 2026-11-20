import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const archiveRoot = path.resolve("archive");
const outputFile = path.resolve("data/archive-index.json");

const ignoredFiles = new Set([
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",
    ".gitkeep",
    "README.md"
]);

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
        }

        else if (entry.isFile()) {
            const extension = path.extname(entry.name).toLowerCase();

            const file = "archive/" +
                itemPath.split("/")
                    .map(encodeURIComponent)
                    .join("/");

            if (extension === ".html" || extension === ".htm") {
                items.push({
                    title: entry.name.replace(/\.html?$/i, ""),
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

async function generateIndex() {
    const navigation = await scanDirectory(archiveRoot);

    await mkdir("data", { recursive: true });

    const index = {
        generatedAt: new Date().toISOString(),
        navigation
    };

    await writeFile(
        outputFile,
        JSON.stringify(index, null, 2) + "\n"
    );

    console.log("Archive index generated successfully.");
}

generateIndex().catch(error => {
    console.error("Failed to generate archive index:", error);
    process.exit(1);
});
