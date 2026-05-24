const fs = require('fs');

let hook = fs.readFileSync('src/hooks/useCustomerState.ts', 'utf8');
// Rimuovi gli import di UI inutilizzati
hook = hook.replace(/import Logo.*?\n/, '');
hook = hook.replace(/import PullToRefresh.*?\n/, '');
// Esporta getMacroCategory
hook = hook.replace('const getMacroCategory = (cat: string) => {', 'export const getMacroCategory = (cat: string) => {');
fs.writeFileSync('src/hooks/useCustomerState.ts', hook, 'utf8');

let ui = fs.readFileSync('src/components/CustomerInterface.tsx', 'utf8');
// Import getMacroCategory
ui = ui.replace('import { useCustomerState } from "../hooks/useCustomerState";', 'import { useCustomerState, getMacroCategory } from "../hooks/useCustomerState";');
// Fix size="xs" for Logo just changing to "sm" to fix typing
ui = ui.replace(/<Logo\s+size="xs"/g, '<Logo size="sm"');
ui = ui.replace(/<LogoG\s+size="xs"/g, '<LogoG size="sm"');

fs.writeFileSync('src/components/CustomerInterface.tsx', ui, 'utf8');
