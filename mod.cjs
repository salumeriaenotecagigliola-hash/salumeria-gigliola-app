const fs = require('fs');

let code = fs.readFileSync('src/components/CustomerInterface.tsx', 'utf8');

const navStart = code.indexOf('{/* Combined Sticky Navigation */}');
if (navStart === -1) { console.error('Nav not found'); process.exit(1); }
const navEnd = code.indexOf('{/* Categories and Products */}');

let navChunk = code.substring(navStart, navEnd);

// Rimuovi navChunk dal suo posto originale
code = code.substring(0, navStart) + code.substring(navEnd);

// Trova la fine dell'header
const headerEndPattern = '<div className="w-12 h-12" aria-hidden="true" /> {/* Spacer for centering */}\n      </header>';
const headerEndIndex = code.indexOf(headerEndPattern) + headerEndPattern.length;

// Modifichiamo navChunk in modo che non abbia className sticky
// Sostituiamo il className della Navigation originale:
// navChunk.indexOf('`sticky z-30') -> rimuove sticky.
navChunk = navChunk.replace(/className=\{`sticky z-30.*?`\}/s, "className={`flex flex-col transition-all duration-300 ${isScrolled ? \"pt-1 pb-1 gap-1\" : \"pt-2 pb-4 gap-4\"}`}");

// Inseriamolo nell'header, solo se isJoined
let newHeaderEnd = `
        {activeCategoriesOriginal.length > 0 && customerMode !== "welcome" && (
          <div className="w-full mt-2">\n` + navChunk + `</div>\n        )}
      </header>`;

code = code.substring(0, headerEndIndex).replace(headerEndPattern, '<div className="w-12 h-12" aria-hidden="true" /> {/* Spacer for centering */}\n        </div>' + newHeaderEnd) + code.substring(headerEndIndex);

// Aggiorna l'header per farlo restringere bene
code = code.replace(
  /className=\{`sticky top-0 z-40 bg-\[#faf9f6\]\/95 backdrop-blur-xl -mx-4 sm:-mx-6 px-4 sm:px-6 flex items-center justify-between border-b border-brand-black\/5 transition-all duration-300 \$\{isScrolled \? "py-1\.5 shadow-sm" : "py-3 mb-2"\}`\}/,
  "className={`sticky top-0 z-50 bg-[#faf9f6]/95 backdrop-blur-xl -mx-4 sm:-mx-6 px-4 sm:px-6 flex flex-col border-b border-brand-black/5 transition-all duration-300 ${isScrolled ? \"py-2 shadow-sm\" : \"py-4 mb-2\"}`}\n      >\n        <div className=\"flex items-center justify-between w-full\">"
);

code = code.replace(
  /<Logo size=\{isScrolled \? "sm" : "md"\} \/>/g,
  '<Logo size={isScrolled ? "xs" : "md"} />'
);

// TABLE MISSING VALIDATION
code = code.replace(
  /const \[missingTableError, setMissingTableError\] = useState\(false\);/g,
  ''
);

code = code.replace(
  /const \{/g,
  'const [missingTableError, setMissingTableError] = useState(false);\n  const {'
);

code = code.replace(
  /handleOrderInitiation,/g,
  'handleOrderInitiation: originalHandleOrderInitiation,'
);

code = code.replace(
  'return (\n    <PullToRefresh',
  `const handleOrderInitiation = () => {
    if (customerMode === "orderTable" && !tableNumber && !isManager) {
      setMissingTableError(true);
      setTimeout(() => setMissingTableError(false), 5000);
      return;
    }
    originalHandleOrderInitiation();
  };

  return (
    <PullToRefresh`
);

code = code.replace(
  /\{missingTableError && \(.*?\)\}/g,
  ''
);

code = code.replace(
  '{customerMode === "welcome" && (',
  `<AnimatePresence>
        {missingTableError && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-4 right-4 z-[100] bg-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <Info size={24} className="flex-shrink-0" />
            <p className="font-bold text-sm leading-tight uppercase tracking-wider">
              Attenzione: Inserisci il numero del tuo tavolo per poter ordinare
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {customerMode === "welcome" && (`
);

fs.writeFileSync('src/components/CustomerInterface.tsx', code, 'utf8');
console.log('Done script');
