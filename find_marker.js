const fs = require('fs');
const path = 'C:\\Users\\workstation\\Desktop\\otitech\\admin\\js\\admin.js';
let content = fs.readFileSync(path, 'utf8');
const index = content.indexOf('document.querySelector(\'#adminSidebarNav\')');
console.log('Index:', index);
if (index !== -1) {
    const prevSemicolon = content.lastIndexOf('};', index);
    console.log('Prev }; at:', prevSemicolon);
    console.log('Context:', JSON.stringify(content.substring(prevSemicolon - 10, index + 50)));
}