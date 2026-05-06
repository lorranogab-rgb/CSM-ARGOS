import fs from 'fs';
const content = fs.readFileSync('src/App.tsx', 'utf8');

const regexParana = /const LOGO_PARANA = "data:image\/svg\+xml;base64,(.*?)";/;
const regexCbmpr = /const LOGO_CBMPR = "data:image\/svg\+xml;base64,(.*?)";/;

const matchParana = content.match(regexParana);
const matchCbmpr = content.match(regexCbmpr);

if (matchParana) {
  const svg = Buffer.from(matchParana[1], 'base64').toString('utf8');
  fs.writeFileSync('LOGO_PARANA.svg', svg);
  console.log('LOGO_PARANA.svg extracted');
}

if (matchCbmpr) {
  const svg = Buffer.from(matchCbmpr[1], 'base64').toString('utf8');
  fs.writeFileSync('LOGO_CBMPR.svg', svg);
  console.log('LOGO_CBMPR.svg extracted');
}
