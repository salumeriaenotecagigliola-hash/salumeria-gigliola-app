const fs = require('fs');
let code = fs.readFileSync('src/components/CustomerInterface.tsx', 'utf8');

const marker = '          import React, { useEffect, useState } from "react";\nimport { useCustomerState, getMacroCategory }';
const idx = code.indexOf(marker);
if (idx === -1) {
  console.log("MARKER NOT FOUND!");
  process.exit(1);
}

// Slice from 'import React...'
let restore = code.substring(idx + 10); // +10 to skip the spaces before 'import'

// Restore global replacements
restore = restore.replace(
  /const \[missingTableError, setMissingTableError\] = useState\(false\);\n  const \{/g,
  'const {'
);

restore = restore.replace(
  /handleOrderInitiation: originalHandleOrderInitiation,/g,
  'handleOrderInitiation,'
);

// We keep the Logo xs replacement because it's correct actually, we want the logo to shrink!
// But just in case, we can set it back if we want to manually apply it.
restore = restore.replace(
  /<Logo size=\{isScrolled \? "xs" : "md"\} \/>/g,
  '<Logo size={isScrolled ? "sm" : "md"} />'
);

fs.writeFileSync('src/components/CustomerInterface.tsx', restore, 'utf8');
console.log('Restored!');
