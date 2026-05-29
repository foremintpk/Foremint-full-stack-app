const fs = require('fs');
const path = require('utf8'); // Wait, require('path')

const fs2 = require('fs');
const path2 = require('path');

function walk(dir) {
    const files = fs2.readdirSync(dir);
    for (const file of files) {
        const fullPath = path2.join(dir, file);
        if (fs2.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file === 'page.tsx' || file === 'layout.tsx') {
            let content = fs2.readFileSync(fullPath, 'utf8');
            // Remove BOM if present
            content = content.replace(/^\uFEFF/, '');
            
            if (!content.includes('export default')) {
                // Better name sanitization
                let name = path2.basename(path2.dirname(fullPath))
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
                    placeholder = `export default function ${name}Page() { return <div>Placeholder for ${path2.dirname(fullPath)}</div>; }\n`;
                }
                fs2.writeFileSync(fullPath, placeholder, 'utf8');
                console.log(`Fixed: ${fullPath} with name ${name}`);
            }
        }
    }
}

walk(path2.join(process.cwd(), 'src', 'app'));
