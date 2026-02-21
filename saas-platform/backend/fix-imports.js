const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

function fixImports() {
    walkDir('./src', (filePath) => {
        if (!filePath.endsWith('.ts')) return;

        const content = fs.readFileSync(filePath, 'utf8');

        let newContent = content
            // Update relative paths like '../../modules/auth/...' to '../../core/auth/...'
            .replace(/(['"])([\.\/]+)modules\//g, '$1$2core/')
            // specifically for absolute or standard paths if any but we mostly use relative in nest
            .replace(/from ['"]\.\/modules\//g, 'from \'./core/')
            // also check for any occurrences like '../modules'
            .replace(/\.\.\/modules/g, '../core')
            .replace(/\.\/modules/g, './core');

        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log('Fixed:', filePath);
        }
    });

    console.log('Done fixing imports.');
}

fixImports();
