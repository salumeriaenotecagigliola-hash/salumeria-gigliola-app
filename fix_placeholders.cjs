const fs = require('fs');
let code1 = fs.readFileSync('src/components/CustomerInterface.tsx', 'utf8');
code1 = code1.replace(/placeholder=t\("([^"]+)",\s*lang\)/g, 'placeholder={t("$1", lang)}');
fs.writeFileSync('src/components/CustomerInterface.tsx', code1, 'utf8');

let code2 = fs.readFileSync('src/components/ManagerInterface.tsx', 'utf8');
code2 = code2.replace(/placeholder=t\("([^"]+)",\s*lang\)/g, 'placeholder={t("$1", lang)}');
fs.writeFileSync('src/components/ManagerInterface.tsx', code2, 'utf8');
console.log('Fixed placeholders');
