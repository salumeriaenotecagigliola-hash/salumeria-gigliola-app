import fs from 'fs';

const menuPath = './src/data/menu.json';
const menuStr = fs.readFileSync(menuPath, 'utf8');
let menu = JSON.parse(menuStr);

menu = menu.map((item: any) => {
  if (item.name.it === 'Spritz Aperol / Campari') {
    item.name = { it: 'Spritz', en: 'Spritz', de: 'Spritz' };
    item.options = ['Aperol', 'Campari'];
  } else if (item.name.it === 'Gin Tonic / Lemon') {
    item.name = { it: 'Gin', en: 'Gin', de: 'Gin' };
    item.options = ['Tonic', 'Lemon'];
  } else if (item.name.it === 'Acqua Naturale / Frizzante (0,5 L)') {
    item.name = { it: 'Acqua (0,5 L)', en: 'Acqua (0,5 L)', de: 'Acqua (0,5 L)' };
    item.options = ['Naturale', 'Frizzante'];
  } else if (item.name.it === 'Bibite Classiche') {
    item.options = ['Coca-Cola', 'Coca Zero', 'Fanta', 'Sprite'];
  } else if (item.name.it === 'Tè Freddo') {
    item.options = ['Limone', 'Pesca'];
  } else if (item.name.it === 'Birra dello Stretto') {
    item.options = ['Classica', 'Non Filtrata', 'Rossa'];
  }
  
  if (item.name.it === 'Il "Gran Gigliola"') {
    item.requiresWeight = true;
  }
  
  return item;
});

fs.writeFileSync(menuPath, JSON.stringify(menu, null, 2), 'utf8');
console.log('Menu updated');
