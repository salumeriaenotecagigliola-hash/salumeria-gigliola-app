const fs = require('fs');

const content = fs.readFileSync('src/components/CustomerInterface.tsx', 'utf8');

// Trova la fine della dichiarazione dei props
const startLogicIndex = content.indexOf('}: Props) {') + '}: Props) {'.length;
// Trova l'inizio del return ( UI
const endLogicIndex = content.indexOf('  return (\n    <PullToRefresh');

if (startLogicIndex === -1 || endLogicIndex === -1) {
    console.error("Non trovato");
    process.exit(1);
}

const imports = content.slice(0, content.indexOf('export default function CustomerInterface'));
const logic = content.slice(startLogicIndex, endLogicIndex);

// Estrai tutte le variabili definite per restituirle
const variablesMatches = [...logic.matchAll(/(?:const|let|var)\s+(?:\[([^\]]+)\]|([a-zA-Z0-9_]+))\s*=/g)];
const variables = new Set();
variablesMatches.forEach(m => {
    if (m[1]) {
        // destructuring array like [cart, setCart]
        m[1].split(',').forEach(v => variables.add(v.trim()));
    } else if (m[2]) {
        variables.add(m[2].trim());
    }
});

// Estrai tutte le funzioni definite
const functionMatches = [...logic.matchAll(/(?:const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|function\s+([a-zA-Z0-9_]+)\s*\()/g)];
functionMatches.forEach(m => {
    if (m[1]) variables.add(m[1].trim());
    if (m[2]) variables.add(m[2].trim());
});

const returnObj = Array.from(variables).filter(v => v && !v.includes(':')).join(', ');

const hookCode = `${imports}
/**
 * Hook Centralizzato per lo stato del Cliente.
 * Responsabilità: Gestire ordini, carrello, Firebase e UI state come da pattern "Stato Centrale".
 */
export function useCustomerState(props: any) {
  const { lang, setLang, onOpenAdmin, editMode, initialCart, initialTable, initialNotes, orderId, onEditComplete, isManager, minPrepTime, onNavigateManager } = props;
  
${logic}

  return {
    lang, setLang, onOpenAdmin, editMode, isManager, minPrepTime, onNavigateManager,
    ${returnObj}
  };
}
`;

if (!fs.existsSync('src/hooks')) {
    fs.mkdirSync('src/hooks');
}
fs.writeFileSync('src/hooks/useCustomerState.ts', hookCode, 'utf8');

const newUI = `import React, { useEffect, useState } from "react";
import { useCustomerState } from "../hooks/useCustomerState";
import { ShoppingCart, Plus, Minus, Send, ClipboardList, Info, X, Download, Settings, ChevronDown, Menu, Globe, ListChecks, CheckCircle2, ArrowRightLeft, ArrowLeft } from "lucide-react";
import Logo from "./Logo";
import PullToRefresh from "./PullToRefresh";
import { motion, AnimatePresence } from "motion/react";
import { t } from "../lib/i18n";
import { Extra, Product, OrderItem, Language } from "../types";

export interface Props {
  lang: Language;
  setLang?: (lang: Language) => void;
  onOpenAdmin?: () => void;
  editMode?: boolean;
  initialCart?: OrderItem[];
  initialTable?: string;
  initialNotes?: string;
  orderId?: string;
  onEditComplete?: () => void;
  isManager?: boolean;
  minPrepTime?: number;
  onNavigateManager?: (view: string, tab: string) => void;
}

/**
 * CustomerInterface (UI Component)
 * Responsabilità: Rendering dell'interfaccia utente (UI) separata dalla logica.
 */
export default function CustomerInterface(props: Props) {
  const state = useCustomerState(props);
  const {
    lang, setLang, onOpenAdmin, editMode, isManager, onNavigateManager,
    ${returnObj}
  } = state;

  return (
    <PullToRefresh${content.slice(endLogicIndex + '  return (\n    <PullToRefresh'.length)}
`;

fs.writeFileSync('src/components/CustomerInterface.tsx', newUI, 'utf8');
console.log("Completato");
