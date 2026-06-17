import { Product } from "../types";
import menuData from "../data/menu.json";

const STORAGE_KEY = "puglia_menu_products";
const UNDO_STACK_KEY = "puglia_menu_undo_stack";

const generateId = () => Math.random().toString(36).substr(2, 9);

export const getCategoryMacros = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem("puglia_category_macros") || "{}");
  } catch {
    return {};
  }
};

export const setCategoryMacro = (category: string, macro: string) => {
  try {
    const config = getCategoryMacros();
    config[category] = macro;
    localStorage.setItem("puglia_category_macros", JSON.stringify(config));
  } catch {}
};

export const deleteCategoryMacro = (category: string) => {
  try {
    const config = getCategoryMacros();
    delete config[category];
    localStorage.setItem("puglia_category_macros", JSON.stringify(config));
  } catch {}
};

export const getMenu = (): Product[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      let parsed = JSON.parse(data) as Product[];
      let changed = false;

      // Force sync allergens from menu.json for existing products to ensure the new mapping is applied
      parsed = parsed.map(p => {
        let pChanged = false;
        const sourceItem = (menuData as any[]).find(m => m.name.it === p.name.it && m.category.it === p.category.it);
        const newP = { ...p };
        
        if (!newP.id) {
          newP.id = generateId();
          pChanged = true;
        }

        if (sourceItem) {
          if (sourceItem.allergens && JSON.stringify(newP.allergens) !== JSON.stringify(sourceItem.allergens)) {
            newP.allergens = sourceItem.allergens;
            pChanged = true;
          }
          if (sourceItem.name && JSON.stringify(newP.name) !== JSON.stringify(sourceItem.name)) {
            newP.name = sourceItem.name;
            pChanged = true;
          }
          if (sourceItem.category && JSON.stringify(newP.category) !== JSON.stringify(sourceItem.category)) {
            newP.category = sourceItem.category;
            pChanged = true;
          }
          if (sourceItem.description && JSON.stringify(newP.description) !== JSON.stringify(sourceItem.description)) {
            newP.description = sourceItem.description;
            pChanged = true;
          }
        }

        if (newP.category && newP.category.it && newP.category.it.includes("Puglia Bowl") && newP.price !== 10.5) {
          newP.price = 10.5;
          pChanged = true;
        }
        
        if (pChanged) changed = true;
        return newP;
      });

      // Auto-restore missing default Aperitivo logic
      const hasAlcolico = parsed.some(p => p.name?.it === "Aperitivo Alcolico");
      const hasAnalcolico = parsed.some(p => p.name?.it === "Aperitivo Analcolico");
      
      if (!hasAlcolico || !hasAnalcolico) {
        const initialMenu = menuData as any[];
        if (!hasAlcolico) {
          const defaultsAlc = initialMenu.find(p => p.name.it === "Aperitivo Alcolico");
          if (defaultsAlc) { parsed.unshift({ ...defaultsAlc, id: defaultsAlc.id || generateId() } as Product); changed = true; }
        }
        if (!hasAnalcolico) {
          const defaultsAn = initialMenu.find(p => p.name.it === "Aperitivo Analcolico");
          if (defaultsAn) { parsed.unshift({ ...defaultsAn, id: defaultsAn.id || generateId() } as Product); changed = true; }
        }
      }
      
      if (changed) {
        saveMenuDirectly(parsed);
      }

      return parsed;
    }
  } catch (error) {
    console.error("Error reading menu from localStorage", error);
  }
  
  // Fallback to initial data, ensuring all items have an id
  const initialMenu = (menuData as any[]).map(item => ({
    ...item,
    id: item.id || generateId()
  })) as Product[];
  
  saveMenuDirectly(initialMenu);
  return initialMenu;
};

const saveMenuDirectly = (menu: Product[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(menu));
  } catch (error) {
    console.error("Error saving menu to localStorage", error);
  }
};

export const saveMenu = (menu: Product[]) => {
  pushUndoState();
  saveMenuDirectly(menu);
};

export const pushUndoState = () => {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      if (current) {
         let stack = [];
         try {
           stack = JSON.parse(localStorage.getItem(UNDO_STACK_KEY) || "[]");
         } catch {}
         stack.push(JSON.parse(current));
         localStorage.setItem(UNDO_STACK_KEY, JSON.stringify(stack.slice(-20))); // keep last 20
      }
    } catch {}
};

export const undoLastAction = (): boolean => {
    try {
       let stack = JSON.parse(localStorage.getItem(UNDO_STACK_KEY) || "[]");
       if (stack.length > 0) {
          const prevState = stack.pop();
          localStorage.setItem(UNDO_STACK_KEY, JSON.stringify(stack));
          saveMenuDirectly(prevState);
          return true;
       }
    } catch {}
    return false;
};

export const canUndo = (): boolean => {
    try {
       const stack = JSON.parse(localStorage.getItem(UNDO_STACK_KEY) || "[]");
       return stack.length > 0;
    } catch {
       return false;
    }
};

export const addMenuItem = (item: Omit<Product, "id">): Product => {
  pushUndoState();
  const menu = getMenu();
  const newItem: Product = { ...item, id: generateId() };
  menu.push(newItem);
  saveMenuDirectly(menu);
  return newItem;
};

export const updateMenuItem = (id: string, updatedItem: Omit<Product, "id">): Product | null => {
  const menu = getMenu();
  const index = menu.findIndex(item => item.id === id);
  if (index !== -1) {
    pushUndoState();
    const itemToSave = { ...updatedItem, id } as Product;
    menu[index] = itemToSave;
    saveMenuDirectly(menu);
    return itemToSave;
  }
  return null;
};

export const deleteMenuItem = (id: string): void => {
  const menu = getMenu();
  pushUndoState();
  const newMenu = menu.filter(item => item.id !== id);
  saveMenuDirectly(newMenu);
};
