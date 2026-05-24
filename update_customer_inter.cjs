const fs = require('fs');

const path = 'src/components/CustomerInterface.tsx';
let code = fs.readFileSync(path, 'utf8');

const replacements = [
  { search: /"Gestione Menu"/g, replace: 't("manageMenu", lang)' },
  { search: /"Categorie"/g, replace: 't("manageCategories", lang)' },
  { search: /"Extra"|'Extra'/g, replace: 't("manageExtra", lang)' },
  { search: /"Cross-Selling"/g, replace: 't("manageCrossSelling", lang)' },
  { search: /"Impostazioni"|'Impostazioni'/g, replace: 't("settings", lang)' },
  { search: /"FAQ Allergeni " \?/g, replace: 't("allergensFAQ", lang) + " ?" ' },
  { search: /"Chiamata inviata!"|'Chiamata inviata!'/g, replace: 't("callSent", lang)' },
  { search: /"Nuovo Asporto Staff"/g, replace: 't("newStaffTakeaway", lang)' },
  { search: /"Inserisci i dati per l'ordine d'asporto rapido"/g, replace: 't("enterTakeawayDetails", lang)' },
  { search: /"Completa con i tuoi dati per ordinare"/g, replace: 't("completeDetails", lang)' },
  { search: /> Nome </g, replace: '>{t("firstName", lang)} <' },
  { search: /> Cognome </g, replace: '>{t("lastName", lang)} <' },
  { search: /> Numero di Telefono </g, replace: '>{t("phone", lang)} <' },
  { search: /> Orario di ritiro desiderato </g, replace: '>{t("pickupTime", lang)} <' },
  { search: />Nome</g, replace: '>{t("firstName", lang)}<' },
  { search: />Cognome</g, replace: '>{t("lastName", lang)}<' },
  { search: />Numero di Telefono</g, replace: '>{t("phone", lang)}<' },
  { search: />Orario di ritiro desiderato</g, replace: '>{t("pickupTime", lang)}<' },
  { search: />"Nome"</g, replace: '>{t("firstName", lang)}<' },
  { search: />"Cognome"</g, replace: '>{t("lastName", lang)}<' },
  { search: />"Numero di Telefono"</g, replace: '>{t("phone", lang)}<' },
  { search: />"Orario di ritiro desiderato"</g, replace: '>{t("pickupTime", lang)}<' },
  
  { search: /placeholder="Nome"/g, replace: 'placeholder={t("firstName", lang)}' },
  { search: /placeholder="Cognome"/g, replace: 'placeholder={t("lastName", lang)}' },
  
  { search: /"Passa ad Ordine al Tavolo"|'Passa ad Ordine al Tavolo'/g, replace: 't("switchToTableOrder", lang)' },
  { search: /"Apri Menu per Comanda"|'Apri Menu per Comanda'/g, replace: 't("openMenuCommand", lang)' },
  { search: /"Hai già un ordine\? Recuperalo"|'Hai già un ordine\? Recuperalo'/g, replace: 't("recoverOrderBtn", lang)' },
  { search: /"Hai già effettuato un ordine\?"|'Hai già effettuato un ordine\?'/g, replace: 't("alreadyOrdered", lang)' },
  { search: /"Il tuo nome nell'ordine"|'Il tuo nome nell\'ordine'/g, replace: 't("orderName", lang)' },
  { search: /"Codice ritiro a 4 cifre"|'Codice ritiro a 4 cifre'/g, replace: 't("pickupCode4", lang)' },
  { search: /"Recupera Stato Ordine"|'Recupera Stato Ordine'/g, replace: 't("recoverOrderStatus", lang)' },
  { search: /"Ricerca in corso..."|'Ricerca in corso...'/g, replace: 't("searching", lang)' },
  { search: /"Stato Ordine"|'Stato Ordine'/g, replace: 't("orderStatusTitle", lang)' },
  { search: /"Codice: GIG-"/g, replace: 't("orderCode", lang) + ": GIG-"' },
  { search: /"In elaborazione"/g, replace: 't("processing", lang)' },
  { search: /"In preparazione"/g, replace: 't("preparingU", lang)' }, // Wait, in i18n it's preparingU but usually caps? Wait I made it 'In Preparazione' in some places. Let's use `t("inPrep", lang)`
  { search: /> In elaborazione </g, replace: '>{t("processing", lang)}<' },
  { search: /> In preparazione </g, replace: '>{t("inPrep", lang)}<' },
  { search: /> Pagato /g, replace: '>{t("paidArchived", lang)} ' },
  { search: /> Pagato</g, replace: '>{t("paidArchived", lang)}<' },
  { search: /> Pronto per il ritiro </g, replace: '>{t("readyForPickup", lang)}<' },
  { search: />Pronto per il ritiro</g, replace: '>{t("readyForPickup", lang)}<' },
  { search: /> Dettagli </g, replace: '>{t("details", lang)}<' },
  { search: />Dettagli</g, replace: '>{t("details", lang)}<' },
  { search: /> Passa ad Ordine da Asporto </g, replace: '>{t("switchToTakeaway", lang)}<' },
  { search: />Passa ad Ordine da Asporto</g, replace: '>{t("switchToTakeaway", lang)}<' },
  { search: /"Passa ad Ordine da Asporto"/g, replace: 't("switchToTakeaway", lang)' },
  
  { search: /\|\| "Sconosciuto"/g, replace: '|| t("unknown", lang)' },
  { search: /"Unito al "/g, replace: 't("joinedTo", lang) + " "' },
  { search: /"Ordine "/g, replace: 't("orderNum", lang) + " "' },
  { search: /"PAGATO"/g, replace: 't("paidArchived", lang)' },
  { search: /\|\| "Aggiungi"/g, replace: '|| t("addToCart", lang)' },

  { search: /"Crea il tuo piatto"/g, replace: 't("createYourPlate", lang)' },
  { search: /"Personalizza ingredienti ed extra"/g, replace: 't("customizeIngredientsExtras", lang)' },
  { search: /"Cosa vuoi togliere\?"/g, replace: 't("whatToRemove", lang)' },
  { search: /"Senza"/g, replace: 't("without", lang)' },
  { search: /"Sostituzioni \(Gratis\)"/g, replace: 't("substitutionsFree", lang)' },
  { search: /"Es: \\"Invece del cotto metti il crudo\\""/g, replace: 't("substitutionEx", lang)' },
  { search: /"Aggiungi Extra"/g, replace: 't("manualExtrasTitle", lang)' },
  { search: /"es\. Maionese, Ketchup\.\.\."/g, replace: 't("customExtraPlaceholder", lang)' },
  { search: /"Fatto e continua"/g, replace: 't("doneAndContinue", lang)' },
  { search: /"Riepilogo Personalizzazioni"/g, replace: 't("summaryCustomizations", lang)' },
  { search: /" sostituito con "/g, replace: '" " + t("replacedWith", lang) + " "' },
  { search: /"Senza niente \(vuota\)"/g, replace: 't("emptyFocaccia", lang)' },
  { search: /"Configura Focaccia"/g, replace: 't("configureFocaccia", lang)' },
  { search: /"Che salume vuoi mettere\?"/g, replace: 't("whichSalume", lang)' },
  { search: /"E quale formaggio\?"/g, replace: 't("whichCheese", lang)' },
  { search: /"Seleziona opzione"/g, replace: 't("selectOption", lang)' },
  { search: /"Peso desiderato"/g, replace: 't("desiredWeight", lang)' },
  { search: /"es\. 200g, 3 etti, per 2 persone\.\.\."/g, replace: 't("weightPlaceholder", lang)' },
  { search: /"Note Generali"/g, replace: 't("generalNotes", lang)' },
  { search: /"Richieste speciali\.\.\."/g, replace: 't("specialRequestsPlaceholder", lang)' },

  { search: /"es\. 5"/g, replace: 't("callWaiterPlaceholder", lang)' },
  { search: />"Sconosciuto"</g, replace: '>{t("unknown", lang)}<' },
  
  { search: /"In elaborazione"/g, replace: 't("processing", lang)' },
  { search: /"In preparazione"/g, replace: 't("inPrep", lang)' },
  { search: /"Pronto per il ritiro"/g, replace: 't("readyForPickup", lang)' },

  { search: />Nome</g, replace: '>{t("firstName", lang)}<' },
  { search: />Cognome</g, replace: '>{t("lastName", lang)}<' },
];

for (const rep of replacements) {
  code = code.replace(rep.search, rep.replace);
}

fs.writeFileSync(path, code, 'utf8');
console.log("CustomerInterface updated.");
