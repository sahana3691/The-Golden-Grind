const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const pages = ["index.html", "about.html", "menu.html", "contact.html"];
const problems = [];
const images = new Set();
const stylesheet = fs.readFileSync("style.css", "utf8");

for (const [, asset] of stylesheet.matchAll(/url\(["']?(\.\/photos\/[^"')]+\.(?:jpg|jpeg|png|webp))["']?\)/gi)) {
    const filename = asset.replace(/^\.\//, "");
    images.add(filename);
    if (!fs.existsSync(filename)) problems.push(`style.css: missing background image ${filename}`);
}

for (const page of pages) {
    const html = fs.readFileSync(page, "utf8");
    const nav = (html.match(/<nav\b[\s\S]*?<\/nav>/i) || [""])[0];

    for (const label of ["Home", "About", "Menu", "Contact"]) {
        if (!new RegExp(">" + label + "<").test(nav)) {
            problems.push(`${page}: missing ${label} navigation link`);
        }
    }

    for (const [, href] of html.matchAll(/\bhref="([^"]+)"/g)) {
        if (href.startsWith("mailto:") || href.startsWith("#")) continue;
        const target = href.split("#")[0];
        if (target && !fs.existsSync(target)) problems.push(`${page}: missing link target ${target}`);
    }

    for (const [, src] of html.matchAll(/\bsrc="([^"]+\.(?:jpg|jpeg|png|webp))"/gi)) {
        images.add(src);
        if (!fs.existsSync(src)) problems.push(`${page}: missing image ${src}`);
        else if (fs.statSync(src).size === 0) problems.push(`${page}: empty image ${src}`);
    }

    if (!/<main\b/.test(html)) problems.push(`${page}: missing main content landmark`);
}

for (const filename of images) {
    const signature = fs.readFileSync(filename).subarray(0, 3).toString("hex");
    if (signature !== "ffd8ff") problems.push(`${filename}: not a readable JPEG file signature`);
}

console.log(`Checked ${pages.length} pages and ${images.size} referenced image files.`);
if (problems.length) {
    console.error(problems.join("\n"));
    process.exitCode = 1;
} else {
    console.log("PASS: page links, navigation labels, image paths, and JPEG signatures are valid.");
}

const homeHtml = fs.readFileSync("index.html", "utf8");
const menuHtml = fs.readFileSync("menu.html", "utf8");
const siteScript = fs.readFileSync("scrip.js", "utf8");
const menuItems = [...menuHtml.matchAll(/<h3>([^<]+)<\/h3>/g)].map(([, label]) => label);
assert.deepEqual(menuItems, ["Classic Coffee", "Espresso", "Cappuccino", "Cafe Latte", "Mocha", "Iced Latte", "Cold Coffee", "Chocolate Cake", "Chocolate Cake Slice"]);
for (const [name, price] of [["Classic Coffee", 120], ["Espresso", 100], ["Cappuccino", 150], ["Cafe Latte", 160], ["Mocha", 180], ["Iced Latte", 160], ["Cold Coffee", 170], ["Chocolate Cake", 180], ["Chocolate Cake Slice", 150]]) {
    assert.match(menuHtml, new RegExp(`<h3>${name}<\\/h3>[\\s\\S]*?&#8377;${price}`));
}
assert.match(menuHtml, /id="full-menu"/);
assert.match(homeHtml, /href="menu\.html#full-menu"/);
const favoriteItems = [...homeHtml.matchAll(/<div class="menu-card-copy"><h3>([^<]+)<\/h3>/g)].map(([, label]) => label);
assert.deepEqual(favoriteItems, ["Classic Coffee", "Chocolate Cake", "Iced Latte"]);
assert.match(stylesheet, /\.menu-grid\s*\{\s*grid-template-columns:\s*repeat\(3,/);
assert.match(stylesheet, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.menu-grid\s*\{\s*grid-template-columns:\s*repeat\(2,/);
assert.match(stylesheet, /@media\s*\(max-width:\s*520px\)[\s\S]*?\.menu-grid\s*\{\s*grid-template-columns:\s*1fr;/);
console.log("PASS: full menu categories, items, prices, and Explore link target are present.");
console.log("PASS: three homepage favorites are preserved and menu grids adapt across desktop, tablet, and mobile breakpoints.");
assert.match(homeHtml, /id="view-menu"/);
assert.match(homeHtml, /id="favorites"/);
let menuClick;
let didScroll = false;
const yearText = { textContent: "" };
const mockDocument = {
    querySelectorAll() { return []; },
    querySelector(selector) {
        if (selector === "#view-menu") return { addEventListener: (_name, handler) => { menuClick = handler; } };
        if (selector === "#favorites") return { scrollIntoView: (options) => { didScroll = options.behavior === "smooth"; } };
        if (selector === "[data-year]") return yearText;
        return null;
    }
};
vm.runInNewContext(siteScript, { document: mockDocument, Date, window: { matchMedia: () => ({ matches: true }) } });
assert.equal(typeof menuClick, "function", "View Menu click handler is installed");
menuClick();
assert.equal(didScroll, true, "View Menu scrolls smoothly to favorites");
assert.equal(yearText.textContent, new Date().getFullYear(), "Footer year is filled in");
console.log("PASS: View Menu behavior and footer year logic run without errors.");

(async function checkLocalServer() {
    const assets = [...pages, ...images, "style.css", "sections/navbar.css", "scrip.js"];
    for (const asset of assets) {
        try {
            const response = await fetch(`http://127.0.0.1:8765/${encodeURI(asset)}`);
            if (!response.ok) problems.push(`HTTP ${response.status}: ${asset}`);
            await response.arrayBuffer();
        } catch (error) {
            problems.push(`Local server request failed for ${asset}: ${error.message}`);
        }
    }
    console.log(`Checked ${assets.length} page and asset URLs over local HTTP.`);
    if (problems.length) {
        console.error(problems.join("\n"));
        process.exitCode = 1;
    } else {
        console.log("PASS: all requested pages and local assets return successfully from the server.");
    }
})();
