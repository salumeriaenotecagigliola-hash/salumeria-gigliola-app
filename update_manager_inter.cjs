const fs = require('fs');

const path = 'src/components/ManagerInterface.tsx';
let code = fs.readFileSync(path, 'utf8');

const replacements = [
  { search: /"Gestione Ordini"/g, replace: 't("manageOrders", lang)' },
  { search: /"Gestione Menu"/g, replace: 't("manageMenu", lang)' },
  { search: /"Categorie"/g, replace: 't("manageCategories", lang)' },
  { search: /"Extra"|'Extra'/g, replace: 't("manageExtra", lang)' },
  { search: /"Cross-Selling"/g, replace: 't("manageCrossSelling", lang)' },
  { search: /"Impostazioni"|'Impostazioni'/g, replace: 't("settings", lang)' },  
  { search: /"Impostazioni Sistema"/g, replace: 't("settingsStaff", lang)' },
  
  { search: /"Area Protetta"/g, replace: 't("protectedArea", lang)' },
  { search: /"Questa zona contiene dati sensibili di incasso. Inserisci la password dello staff."/g, replace: 't("protectedAreaDesc", lang)' },
  { search: /"Password errata"/g, replace: 't("wrongPassword", lang)' },
  { search: /"Sblocca Area Protetta"/g, replace: 't("unlockProtectedArea", lang)' },
  { search: /"Account Staff:"/g, replace: 't("staffAccount", lang)' },
  { search: /"Hai dimenticato la password\? Resetta a '1234'"/g, replace: 't("forgotPassword", lang)' },
  { search: /"Impostazioni Staff"/g, replace: 't("staffSettings", lang)' },
  { search: /"Modifica Password Area Protetta"/g, replace: 't("changePassword", lang)' },
  { search: /"Password Attuale"/g, replace: 't("currentPassword", lang)' },
  { search: /"Nuova Password"/g, replace: 't("newPassword", lang)' },
  { search: /"Salva Nuova Password"/g, replace: 't("saveNewPassword", lang)' },
  
  { search: /"Tempo min. prep. Asporto \(minuti\)"/g, replace: 't("minPrepTimeSetting", lang)' },
  { search: /"Orari Apertura Asporto"/g, replace: 't("takeawayHoursSetting", lang)' },
  { search: /"Salva Orari Apertura"/g, replace: 't("saveTakeawayHours", lang)' },
  { search: /"Disconnetti Account Staff"/g, replace: 't("logoutStaff", lang)' },
  
  { search: /"Unione Tavoli"/g, replace: 't("joinTables", lang)' },
  { search: /"Collega permanentemente un tavolo ad un altro per unire i pagamenti automaticamente."/g, replace: 't("joinTablesDesc", lang)' },
  { search: /"Aggiungi Collegamento"/g, replace: 't("addLink", lang)' },
  { search: /"Tavolo 'Figlio'"/g, replace: 't("childTable", lang)' },
  { search: /"Tavolo 'Master'"/g, replace: 't("masterTable", lang)' },
  { search: /"Unisci Tavoli"/g, replace: 't("joinTablesBtn", lang)' },
  { search: /"Tavoli Uniti Attualmente"/g, replace: 't("joinedTablesList", lang)' },
  { search: /"Seleziona categoria"/g, replace: 't("viewCategories", lang)' },
  
  { search: /"Locale Chiuso per Asporto"/g, replace: 't("storeClosed", lang)' },
  { search: /"Chiamate Cameriere Ricevute"/g, replace: 't("waiterCallsRecieved", lang)' },
  { search: /"Gestita"/g, replace: 't("callHandled", lang)' },
  { search: /"Nessun operatore"/g, replace: 't("noWaitOperator", lang)' },
  { search: /"Tavoli divisi correttamente"/g, replace: 't("tablesSplitted", lang)' },
  { search: /"Errore nella divisione dei tavoli"/g, replace: 't("errorTablesSplit", lang)' },
  { search: /"Sei sicuro\? Questa operazione riporterà la password a '1234'\. Usala solo se hai dimenticato quella attuale\."/g, replace: 't("changePasswordMsg", lang)' },
  { search: /"Salvataggio..."/g, replace: 't("savingHours", lang)' },
];

for (const rep of replacements) {
  code = code.replace(rep.search, rep.replace);
}

fs.writeFileSync(path, code, 'utf8');
console.log("ManagerInterface updated.");
