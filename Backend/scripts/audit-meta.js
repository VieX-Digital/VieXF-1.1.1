const fs = require('fs');
const path = require('path');

const tweaksDir = path.join(__dirname, '../tweaks');
const files = fs.readdirSync(tweaksDir, { withFileTypes: true });

const report = [];

for (const dir of files) {
    if (!dir.isDirectory()) continue;
    const metaPath = path.join(tweaksDir, dir.name, 'meta.json');
    if (!fs.existsSync(metaPath)) {
        console.log(`[MISSING] ${dir.name}`);
        continue;
    }
    
    try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        // normalize to check if mapped
        const title = typeof meta.title === 'object' ? meta.title.vi : meta.title;
        const desc = typeof meta.description === 'object' ? meta.description.vi : meta.description;
        
        report.push({
            id: dir.name,
            title: title || "",
            desc: desc || ""
        });
    } catch (e) {
        console.log(`[ERROR] ${dir.name}: ${e.message}`);
    }
}

console.log(JSON.stringify(report, null, 2));
