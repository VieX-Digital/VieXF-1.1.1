const fs = require('fs');
const path = require('path');

const tweaksDir = path.join(__dirname, '../tweaks');

// Map of translations for common items (optional, can be expanded)
const commonTranslations = {
    "align-taskbar-left": {
        title: "Align Taskbar to Left",
        description: "Alignt taskbar to the left side.",
        deepDescription: "Forces Windows taskbar to align left by modifying registry (TaskbarAl = 0)."
    },
    // Add more if known
};

async function migrate() {
    console.log("Starting migration of meta.json files...");
    const files = fs.readdirSync(tweaksDir, { withFileTypes: true });

    for (const dir of files) {
        if (!dir.isDirectory()) continue;
        const metaPath = path.join(tweaksDir, dir.name, 'meta.json');
        
        if (!fs.existsSync(metaPath)) continue;

        try {
            const content = fs.readFileSync(metaPath, 'utf8');
            const meta = JSON.parse(content);
            let updated = false;

            const fields = ['title', 'description', 'deepDescription'];
            
            for (const field of fields) {
                if (meta[field] && typeof meta[field] === 'string') {
                    const original = meta[field];
                    const enTranslation = commonTranslations[dir.name] ? commonTranslations[dir.name][field] : original; // Default to original key if known or original text
                    
                    meta[field] = {
                        vi: original,
                        en: enTranslation // Ideally we would translate this
                    };
                    updated = true;
                }
            }

            if (updated) {
                fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
                console.log(`Updated ${dir.name}/meta.json`);
            }
        } catch (err) {
            console.error(`Failed to process ${dir.name}:`, err);
        }
    }
    console.log("Migration complete.");
}

migrate();
