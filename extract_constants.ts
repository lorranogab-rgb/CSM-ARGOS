
import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

const startLine = 32; // // --- CONSTANTES GLOBAIS ---
const endLine = 216; // End of SCORE_CATEGORIES (one after)

const extractedLines = lines.slice(startLine - 1, endLine).map(line => {
    if (line.trim().startsWith('const ')) {
        return 'export ' + line;
    }
    return line;
});

const header = "import { Vehicle } from './types';\n\n";
const constantsContent = header + extractedLines.join('\n');

fs.writeFileSync('src/constants.ts', constantsContent);
console.log('Constants extracted to src/constants.ts');
