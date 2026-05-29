const fs = require('fs');
const path = require('path');

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file === 'page.tsx' || file === 'layout.tsx') {
            let content = fs.readFileSync(fullPath, 'utf8');
            // Remove BOM
            content = content.replace(/^\uFEFF/, '');
            
            // If it's a stub (either empty, just a comment, or my previous bad placeholder)
            if (content.length < 200 && (!content.includes('export default') || content.includes('function ('))) {
                let name = path.basename(path.dirname(fullPath))
                    .replace(/\(/g, '')
                    .replace(/\)/g, '')
                    .replace(/\[/g, '')
                    .replace(/\]/g, '')
                    .replace(/-/g, '')
                    .replace(/[^a-zA-Z0-9]/g, '');
                
                if (!name || /^\d/.test(name)) name = 'App' + name;
                
                let placeholder = '';
                if (file === 'layout.tsx') {
                    placeholder = `export default function ${name}Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }\n`;
                } else {
                    placeholder = `export default function ${name}Page() { return <div>Placeholder for ${path.dirname(fullPath)}</div>; }\n`;
                }
                fs.writeFileSync(fullPath, placeholder, 'utf8');
                console.log(`Fixed: ${fullPath} with name ${name}`);
            }
        }
    }
}

walk(path.join(process.cwd(), 'src', 'app'));
