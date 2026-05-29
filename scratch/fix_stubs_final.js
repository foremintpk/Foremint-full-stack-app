const fs = require('fs');
const path = require('path');

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file === 'page.tsx' || file === 'layout.tsx' || file === 'route.ts') {
            let content = fs.readFileSync(fullPath, 'utf8');
            content = content.replace(/^\uFEFF/, '');
            
            const isRoute = file === 'route.ts';
            const hasExport = isRoute ? (content.includes('export async function GET') || content.includes('export async function POST')) : content.includes('export default');

            if (content.length < 200 && !hasExport) {
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
                } else if (file === 'page.tsx') {
                    placeholder = `export default function ${name}Page() { return <div>Placeholder for ${path.dirname(fullPath)}</div>; }\n`;
                } else if (file === 'route.ts') {
                    placeholder = `import { NextResponse } from "next/server";\n\nexport async function GET() {\n  return NextResponse.json({ message: "Placeholder for ${path.dirname(fullPath)}" });\n}\n`;
                }
                fs.writeFileSync(fullPath, placeholder, 'utf8');
                console.log(`Fixed: ${fullPath}`);
            }
        }
    }
}

walk(path.join(process.cwd(), 'src', 'app'));
