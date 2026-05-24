import fs from "fs";

const sourceCode = fs.readFileSync("src/components/CustomerInterface.tsx", "utf8");
const varsStr = fs.readFileSync("found-vars.txt", "utf8");

// Trova la fine della dichiarazione dei props
const startLogicIndex = sourceCode.indexOf('}: Props) {') + '}: Props) {'.length;
// Trova l'inizio del return ( UI
const endLogicIndex = sourceCode.indexOf('  return (\n    <PullToRefresh');

const imports = sourceCode.slice(0, sourceCode.indexOf('export default function CustomerInterface'));
const logic = sourceCode.slice(startLogicIndex, endLogicIndex);

const hookCode = `${imports}
/**
 * Hook Centralizzato per lo stato del Cliente.
 * Responsabilità: Gestire ordini, carrello, Firebase e UI state.
 */
export function useCustomerState(props: Props) {
  const { lang, setLang, onOpenAdmin, editMode, initialCart, initialTable, initialNotes, orderId, onEditComplete, isManager, minPrepTime, onNavigateManager } = props;
  
${logic}

  return {
    lang, setLang, onOpenAdmin, editMode, isManager, minPrepTime, onNavigateManager, initialCart, initialTable, initialNotes, orderId, onEditComplete,
    ${varsStr}
  };
}
`;

fs.writeFileSync('src/hooks/useCustomerState.ts', hookCode, 'utf8');

const newUI = `import React, { useEffect, useState } from "react";
import { useCustomerState } from "../hooks/useCustomerState";
import { ShoppingCart, Plus, Minus, Send, ClipboardList, Info, X, Download, Settings, ChevronDown, Menu, Globe, ListChecks, CheckCircle2, ArrowRightLeft, ArrowLeft } from "lucide-react";
import Logo, { LogoG } from "./Logo";
import PullToRefresh from "./PullToRefresh";
import { motion, AnimatePresence } from "motion/react";
import { t } from "../lib/i18n";
import { Extra, Product, OrderItem, Language, OrderStatus } from "../types";
import { allergenIcons } from "../lib/allergenIcons";

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

const ALCOHOLIC_OPTIONS = [
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
];

/**
 * CustomerInterface (UI Component)
 * Responsabilità: Rendering dell'interfaccia utente (UI) separata dalla logica.
 */
export default function CustomerInterface(props: Props) {
  const state = useCustomerState(props);
  const {
    lang, setLang, onOpenAdmin, editMode, isManager, onNavigateManager,
    ${varsStr}
  } = state;

  return (\n    <PullToRefresh${sourceCode.slice(endLogicIndex + '  return (\n    <PullToRefresh'.length)}
`;

fs.writeFileSync('src/components/CustomerInterface.tsx', newUI, 'utf8');
console.log("Completato");
