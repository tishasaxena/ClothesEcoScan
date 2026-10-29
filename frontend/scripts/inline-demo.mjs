// Bundle the demo build into one self-contained HTML page (for hosting as a single file).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const dir = new URL('../dist-demo/', import.meta.url);
const assets = readdirSync(new URL('assets/', dir));
const read = (ext) => assets.filter((f) => f.endsWith(ext)).map((f) => readFileSync(new URL(`assets/${f}`, dir), 'utf8')).join('\n');

const css = read('.css');
const js = read('.js').replace(/<\/script/gi, '<\\/script');

const html = `<meta charset="utf-8">
<title>EcoScan</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#7a4b2a">
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`;
writeFileSync(new URL('ecoscan-demo.html', dir), html);
console.log(`dist-demo/ecoscan-demo.html (${(html.length / 1024).toFixed(0)} kB)`);
