
/**
 * Simple Image Migration Script (ESM Version)
 *
 * Usage:
 * 1. Run from project root: node tools/migrate-images-simple.js
 *
 * Functionality:
 * - Scans constants, components folders, and App.tsx.
 * - Extracts unique Hash from ImgBB image URLs.
 * - Replaces URLs in source code with local paths pointing to /images/[HASH]-[FILENAME].
 * - Assumes images already exist in public/images (skips download).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Implement __dirname in ESM environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ROOT_DIR = path.resolve(__dirname, '..');

const TARGET_PATHS = [
    path.join(ROOT_DIR, 'constants'),
    path.join(ROOT_DIR, 'components'),
    path.join(ROOT_DIR, 'App.tsx')
];
const URL_PREFIX = '/images';

// Regex: Capture Hash and Filename from ImgBB URL
const IMAGE_REGEX = /https:\/\/i\.ibb\.co\/([a-zA-Z0-9]+)\/([\w%\-]+)\.(jpg|png|jpeg|gif)/g;

async function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    // Find all matches
    const matches = [...content.matchAll(IMAGE_REGEX)];

    if (matches.length === 0) return;

    console.log(`\n📄 Processing: ${path.basename(filePath)} (Found images: ${matches.length})`);

    // Replace URLs in code
    const newContent = content.replace(IMAGE_REGEX, (fullUrl, hash, name, ext) => {
        hasChanges = true;
        // Construct the filename format expected to be in public/images
        const uniqueFilename = `${hash}-${name}.${ext}`;
        return `${URL_PREFIX}/${uniqueFilename}`;
    });

    if (hasChanges) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✨ Code update complete: ${path.basename(filePath)}`);
    }
}

async function scanAndProcess(targetPath) {
    if (!fs.existsSync(targetPath)) return;

    const stat = fs.statSync(targetPath);

    if (stat.isDirectory()) {
        const files = fs.readdirSync(targetPath);
        for (const file of files) {
            const fullPath = path.join(targetPath, file);
            await scanAndProcess(fullPath); // Recursive call
        }
    } else if (stat.isFile() && (targetPath.endsWith('.ts') || targetPath.endsWith('.tsx'))) {
        await processFile(targetPath);
    }
}

async function main() {
    console.log("🚀 Starting Simple Image Migration (ESM Mode)...");
    console.log("Assuming images exist in public/images and updating paths only.");

    for (const targetPath of TARGET_PATHS) {
        if (fs.existsSync(targetPath)) {
            await scanAndProcess(targetPath);
        } else {
            console.warn(`⚠️  Path not found: ${targetPath}`);
        }
    }

    console.log("\n🎉 All tasks completed! Source code URLs have been updated.");
}

main();
