const fs = require('fs');

const invalidVars = [
'seen', 'catsWithIndex', 'macroOrder', 'macroA', 'macroB', 'idxMacroA', 'idxMacroB', 'macros', 'order', 'idxA', 'idxB', 'storedName', 'storedCode', 'unsubExtras', 'unsubCrossSell', 'unsubCategoriesConfig', 'unsubTableMappings', 'root', 'members', 'uniqueMembers', 'numA', 'numB', 'observer', 'matchedCategory', 'matchedObj', 'macro', 'btn', 'el', 'now', 'hours', 'minutes', 'minTime', 'activeTable', 'q', 'unsubscribe', 'filtered', 'targetOfThisOrder', 'tA', 'tB', 'd', 'activeOrders', 'virtualActiveOrder', 'cName', 'cPhone', 'handleScroll', 'val', 'codeToSearch', 'activeSnap', 'orders', 'inputTable', 'snapshot', 'activeOrderDocs', 'price', 'extrasCount', 'extrasPrice', 'productExtras', 'hasExistingBase', 'rawIngredients', 'normalizedIngredients', 'finalNote', 'bowlDetails', 'focacciaDetails', 'allExtras', 'existingKey', 'existing', 'img', 'pageWidth', 'imgWidth', 'imgHeight', 'y', 'cleanNotes', 'cartCategoryNames', 'product', 'hasDrinks', 'hasFood', 'shuffleArray', 'drinks', 'cat', 'foods', 'missingCategories', 'otherProducts', 'featured', 'activeCart', 'activeTotal', 'ordersPath', 'activeWaiter', 'redirectionNote', 'mergeByTable', 'existingOrderDoc', 'qActive', 'existingData', 'existingItems', 'cartWithAdditions', 'baseNotes', 'finalNotes', 'docRef', 'code'
];

function processFile(filename) {
    let content = fs.readFileSync(filename, 'utf8');
    
    invalidVars.forEach(v => {
        const regex1 = new RegExp(`\\b${v}\\s*,`, 'g');
        const regex2 = new RegExp(`,\\s*${v}\\b`, 'g');
        content = content.replace(regex1, '').replace(regex2, '');
    });
    
    fs.writeFileSync(filename, content, 'utf8');
}

processFile('src/hooks/useCustomerState.ts');
processFile('src/components/CustomerInterface.tsx');

let ui = fs.readFileSync('src/components/CustomerInterface.tsx', 'utf8');
const ALC = `const ALCOHOLIC_OPTIONS = [
  "Spritz Aperol",
  "Spritz Campari",
  "Gin Tonic",
  "Gin Lemon",
  "Vino Bianco",
  "Vino Rosso",
  "Vino Rosato",
  "Birra Ichnusa",
  "Birra Peroni",
];
const NON_ALCOHOLIC_OPTIONS = [
  "Coca Cola",
  "Coca Cola Zero",
  "Fanta",
  "Sprite",
  "Succo di Frutta",
  "Acqua Tonica",
  "Crodino",
  "Sanbittèr",
  "Acqua frizzante/naturale",
];`;

ui = "import { allergenIcons } from '../lib/allergenIcons';\n" + ALC + "\n" + ui;
fs.writeFileSync('src/components/CustomerInterface.tsx', ui);

let hook = fs.readFileSync('src/hooks/useCustomerState.ts', 'utf8');
hook = hook.replace('import { t } from "../lib/i18n";', 'import { t } from "../lib/i18n";\nimport { allergenIcons } from "../lib/allergenIcons";');
fs.writeFileSync('src/hooks/useCustomerState.ts', hook);
console.log("Fixed!");
