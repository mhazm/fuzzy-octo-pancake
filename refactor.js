const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./app');
let modifiedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Pattern to match the mongoose connect block with flexible indentation
    const connectRegex = /[ \t]*if\s*\(\s*mongoose\.connection\.readyState\s*!==\s*1\s*\)\s*\{\s*await\s+mongoose\.connect\([^)]+\);\s*\}/g;
    
    // Also match just the await mongoose.connect call if it's not in an if block
    const singleConnectRegex = /[ \t]*await\s+mongoose\.connect\([^)]+\);?/g;
    
    let modified = false;

    if (connectRegex.test(content)) {
        content = content.replace(connectRegex, (match) => {
            // Preserve the leading whitespace of the matched block
            const matchWhitespace = match.match(/^[ \t]*/)[0];
            return matchWhitespace + 'await dbConnect();';
        });
        modified = true;
    } else if (singleConnectRegex.test(content)) {
        content = content.replace(singleConnectRegex, (match) => {
             const matchWhitespace = match.match(/^[ \t]*/)[0];
             return matchWhitespace + 'await dbConnect();';
        });
        modified = true;
    }
    
    if (modified) {
        // Add import at the top if not exists
        if (!content.includes('import dbConnect')) {
            // Find the last import statement
            const imports = content.match(/^import.*?;?\s*$/gm);
            if (imports && imports.length > 0) {
                const lastImport = imports[imports.length - 1];
                content = content.replace(lastImport, lastImport + '\nimport dbConnect from "@/lib/mongoose";');
            } else {
                content = 'import dbConnect from "@/lib/mongoose";\n' + content;
            }
        }
        
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
    }
});

console.log(`Successfully refactored ${modifiedCount} files to use dbConnect.`);
