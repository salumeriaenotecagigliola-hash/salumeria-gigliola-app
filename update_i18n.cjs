const fs = require('fs');

const path = 'src/lib/i18n.ts';
let code = fs.readFileSync(path, 'utf8');

const additionalConfig = {
  staffArea: { it: "Area Staff", en: "Staff Area", de: "Personalbereich", fr: "Espace Personnel" },
  allergensFAQ: { it: "FAQ Allergeni", en: "Allergens FAQ", de: "Allergene FAQ", fr: "FAQ Allergènes" },
  callSent: { it: "Chiamata inviata!", en: "Call sent!", de: "Anruf gesendet!", fr: "Appel envoyé !" },
  newStaffTakeaway: { it: "Nuovo Asporto Staff", en: "New Staff Takeaway", de: "Neue Mitnahme Personal", fr: "Nouveau à emporter Personnel" },
  enterTakeawayDetails: { it: "Inserisci i dati per l'ordine d'asporto rapido", en: "Enter details for quick takeaway order", de: "Geben Sie die Daten für die schnelle Mitnahmebestellung ein", fr: "Entrez les détails pour la commande rapide à emporter" },
  completeDetails: { it: "Completa con i tuoi dati per ordinare", en: "Complete with your details to order", de: "Vervollständigen Sie Ihre Daten zur Bestellung", fr: "Complétez avec vos coordonnées pour commander" },
  firstName: { it: "Nome", en: "First Name", de: "Vorname", fr: "Prénom" },
  lastName: { it: "Cognome", en: "Last Name", de: "Nachname", fr: "Nom de famille" },
  phone: { it: "Numero di Telefono", en: "Phone Number", de: "Telefonnummer", fr: "Numéro de téléphone" },
  pickupTime: { it: "Orario di ritiro desiderato", en: "Desired pickup time", de: "Gewünschte Abholzeit", fr: "Heure de retrait souhaitée" },
  switchToTableOrder: { it: "Passa ad Ordine al Tavolo", en: "Switch to Table Order", de: "Zum Tischbestellung wechseln", fr: "Passer à la Commande à Table" },
  openMenuCommand: { it: "Apri Menu per Comanda", en: "Open Menu for Order", de: "Menü für Bestellung öffnen", fr: "Ouvrir le Menu pour Commande" },
  recoverOrderBtn: { it: "Hai già un ordine? Recuperalo", en: "Already have an order? Recover it", de: "Haben Sie bereits eine Bestellung? Wiederherstellen", fr: "Vous avez déjà une commande ? Récupérez-la" },
  alreadyOrdered: { it: "Hai già effettuato un ordine?", en: "Have you already placed an order?", de: "Haben Sie bereits eine Bestellung aufgegeben?", fr: "Avez-vous déjà passé une commande ?" },
  orderName: { it: "Il tuo nome nell'ordine", en: "Your name in the order", de: "Ihr Name in der Bestellung", fr: "Votre nom dans la commande" },
  pickupCode4: { it: "Codice ritiro a 4 cifre", en: "4-digit pickup code", de: "4-stelliger Abholcode", fr: "Code de retrait à 4 chiffres" },
  recoverOrderStatus: { it: "Recupera Stato Ordine", en: "Recover Order Status", de: "Bestellstatus wiederherstellen", fr: "Récupérer le Statut de la Commande" },
  searching: { it: "Ricerca in corso...", en: "Searching...", de: "Suche...", fr: "Recherche en cours..." },
  orderStatusTitle: { it: "Stato Ordine", en: "Order Status", de: "Bestellstatus", fr: "Statut de la Commande" },
  orderCode: { it: "Codice", en: "Code", de: "Code", fr: "Code" },
  processing: { it: "In elaborazione", en: "Processing", de: "In Bearbeitung", fr: "En traitement" },
  readyForPickup: { it: "Pronto per il ritiro", en: "Ready for pickup", de: "Bereit zur Abholung", fr: "Prêt pour le retrait" },
  details: { it: "Dettagli", en: "Details", de: "Details", fr: "Détails" },
  switchToTakeaway: { it: "Passa ad Ordine da Asporto", en: "Switch to Takeaway Order", de: "Zum Mitnahmebestellung wechseln", fr: "Passer à la Commande à Emporter" },
  unknown: { it: "Sconosciuto", en: "Unknown", de: "Unbekannt", fr: "Inconnu" },
  joinedTo: { it: "Unito al", en: "Joined to", de: "Verbunden mit", fr: "Joint à" },
  orderNum: { it: "Ordine", en: "Order", de: "Bestellung", fr: "Commande" },
  createYourPlate: { it: "Crea il tuo piatto", en: "Create your plate", de: "Stellen Sie Ihr Gericht zusammen", fr: "Créez votre assiette" },
  customizeIngredientsExtras: { it: "Personalizza ingredienti ed extra", en: "Customize ingredients and extras", de: "Zutaten und Extras anpassen", fr: "Personnaliser ingrédients et suppléments" },
  whatToRemove: { it: "Cosa vuoi togliere?", en: "What do you want to remove?", de: "Was möchten Sie entfernen?", fr: "Que voulez-vous retirer ?" },
  without: { it: "Senza", en: "Without", de: "Ohne", fr: "Sans" },
  substitutionsFree: { it: "Sostituzioni (Gratis)", en: "Substitutions (Free)", de: "Ersetzungen (Kostenlos)", fr: "Substitutions (Gratuit)" },
  substitutionEx: { it: "Es: \"Invece del cotto metti il crudo\"", en: "E.g. \"Instead of ham, add prosciutto\"", de: "Z.B. \"Statt Schinken, füge Prosciutto hinzu\"", fr: "Ex: \"Au lieu de jambon, ajoutez du prosciutto\"" },
  manualExtrasTitle: { it: "Aggiungi Extra", en: "Add Extras", de: "Extras hinzufügen", fr: "Ajouter des Suppléments" },
  customExtraPlaceholder: { it: "es. Maionese, Ketchup...", en: "e.g. Mayonnaise, Ketchup...", de: "z.B. Mayonnaise, Ketchup...", fr: "ex. Mayonnaise, Ketchup..." },
  doneAndContinue: { it: "Fatto e continua", en: "Done and continue", de: "Fertig und weiter", fr: "Terminé et continuer" },
  summaryCustomizations: { it: "Riepilogo Personalizzazioni", en: "Customizations Summary", de: "Zusammenfassung der Anpassungen", fr: "Résumé des Personnalisations" },
  replacedWith: { it: "sostituito con", en: "replaced with", de: "ersetzt durch", fr: "remplacé par" },
  emptyFocaccia: { it: "Senza niente (vuota)", en: "Nothing (empty)", de: "Ohne alles (leer)", fr: "Sans rien (vide)" },
  configureFocaccia: { it: "Configura Focaccia", en: "Configure Focaccia", de: "Focaccia konfigurieren", fr: "Configurer Focaccia" },
  whichSalume: { it: "Che salume vuoi mettere?", en: "Which cured meat do you want?", de: "Welches Wurstfleisch möchten Sie?", fr: "Quelle charcuterie voulez-vous ?" },
  whichCheese: { it: "E quale formaggio?", en: "And which cheese?", de: "Und welcher Käse?", fr: "Et quel fromage ?" },
  selectOption: { it: "Seleziona opzione", en: "Select option", de: "Option auswählen", fr: "Sélectionner l'option" },
  desiredWeight: { it: "Peso desiderato", en: "Desired weight", de: "Gewünschtes Gewicht", fr: "Poids souhaité" },
  weightPlaceholder: { it: "es. 200g, 3 etti, per 2 persone...", en: "e.g. 200g, 3 hg, for 2 people...", de: "z.B. 200g, 3 hg, für 2 Personen...", fr: "ex. 200g, 3 hg, pour 2 personnes..." },
  generalNotes: { it: "Note Generali", en: "General Notes", de: "Allgemeine Hinweise", fr: "Notes Générales" },
  specialRequestsPlaceholder: { it: "Richieste speciali...", en: "Special requests...", de: "Sonderwünsche...", fr: "Demandes spéciales..." },
  protectedArea: { it: "Area Protetta", en: "Protected Area", de: "Geschützter Bereich", fr: "Zone Protégée" },
  protectedAreaDesc: { it: "Questa zona contiene dati sensibili di incasso. Inserisci la password dello staff.", en: "This area contains sensitive revenue data. Enter the staff password.", de: "Dieser Bereich enthält sensible Umsatzdaten. Geben Sie das Personalpasswort ein.", fr: "Cette zone contient des données de revenus sensibles. Entrez le mot de passe du personnel." },
  wrongPassword: { it: "Password errata", en: "Wrong password", de: "Falsches Passwort", fr: "Mot de passe incorrect" },
  unlockProtectedArea: { it: "Sblocca Area Protetta", en: "Unlock Protected Area", de: "Geschützten Bereich entsperren", fr: "Déverrouiller la Zone Protégée" },
  staffAccount: { it: "Account Staff:", en: "Staff Account:", de: "Personal-Account:", fr: "Compte Personnel :" },
  forgotPassword: { it: "Hai dimenticato la password? Resetta a '1234'", en: "Forgot password? Reset to '1234'", de: "Passwort vergessen? Auf '1234' zurücksetzen", fr: "Mot de passe oublié ? Réinitialiser à '1234'" },
  staffSettings: { it: "Impostazioni Staff", en: "Staff Settings", de: "Personaleinstellungen", fr: "Paramètres du Personnel" },
  changePassword: { it: "Modifica Password", en: "Change Password", de: "Passwort Ändern", fr: "Changer le Mot de Passe" },
  currentPassword: { it: "Password Attuale", en: "Current Password", de: "Aktuelles Passwort", fr: "Mot de Passe Actuel" },
  newPassword: { it: "Nuova Password", en: "New Password", de: "Neues Passwort", fr: "Nouveau Mot de Passe" },
  saveNewPassword: { it: "Salva Nuova Password", en: "Save New Password", de: "Neues Passwort Speichern", fr: "Enregistrer Nouveau Mot de Passe" },
  minPrepTimeSetting: { it: "Tempo min. prep. Asporto (minuti)", en: "Min takeaway prep. time (minutes)", de: "Min. Abholvorbereitungszeit (Minuten)", fr: "Temps min. prép. Emporter (minutes)" },
  takeawayHoursSetting: { it: "Orari Apertura Asporto", en: "Takeaway Opening Hours", de: "Öffnungszeiten Abholung", fr: "Horaires d'Ouverture Emporter" },
  saveTakeawayHours: { it: "Salva Orari Apertura", en: "Save Opening Hours", de: "Öffnungszeiten Speichern", fr: "Enregistrer Horaires Ouverture" },
  logoutStaff: { it: "Disconnetti Account Staff", en: "Logout Staff Account", de: "Personal-Account abmelden", fr: "Déconnexion Compte Personnel" },
  joinTables: { it: "Unione Tavoli", en: "Join Tables", de: "Tische verbinden", fr: "Joindre des Tables" },
  joinTablesDesc: { it: "Collega permanentemente un tavolo ad un altro per unire i pagamenti automaticamente.", en: "Permanently link one table to another to automatically merge payments.", de: "Verbinden Sie einen Tisch dauerhaft mit einem anderen, um Zahlungen automatisch zusammenzuführen.", fr: "Liez définitivement une table à une autre pour fusionner les paiements automatiquement." },
  addLink: { it: "Aggiungi Collegamento", en: "Add Link", de: "Verbindung hinzufügen", fr: "Ajouter un Lien" },
  childTable: { it: "Tavolo 'Figlio'", en: "Child Table", de: "Untergeordneter Tisch", fr: "Table Enfant" },
  masterTable: { it: "Tavolo 'Master'", en: "Master Table", de: "Haupttisch", fr: "Table Maître" },
  joinTablesBtn: { it: "Unisci Tavoli", en: "Join Tables", de: "Tische verbinden", fr: "Joindre des Tables" },
  joinedTablesList: { it: "Tavoli Uniti Attualmente", en: "Currently Joined Tables", de: "Mómentan verbundene Tische", fr: "Tables Actuellement Jointes" },
  tableErrorJoin: { it: "Attenzione: Inserisci il numero del tuo tavolo per poter ordinare", en: "Attention: Enter your table number directly to order", de: "Achtung: Geben Sie Ihre Tischnummer ein, um zu bestellen", fr: "Attention: Entrez votre numéro de table pour commander" },
  manageOrders: { it: "Gestione Ordini", en: "Order Management", de: "Bestellverwaltung", fr: "Gestion des Commandes" },
  manageMenu: { it: "Gestione Menu", en: "Menu Management", de: "Menüverwaltung", fr: "Gestion du Menu" },
  manageCategories: { it: "Categorie", en: "Categories", de: "Kategorien", fr: "Catégories" },
  manageExtra: { it: "Extra", en: "Extras", de: "Extras", fr: "Suppléments" },
  manageCrossSelling: { it: "Cross-Selling", en: "Cross-Selling", de: "Cross-Selling", fr: "Vente croisée" },
  settingsStaff: { it: "Impostazioni Sistema", en: "System Settings", de: "Systemeinstellungen", fr: "Paramètres Système" },
  viewCategories: { it: "Seleziona categoria", en: "Select category", de: "Kategorie auswählen", fr: "Sélectionner la catégorie" },
  storeClosed: { it: "Locale Chiuso per Asporto", en: "Store Closed for Takeaway", de: "Lokal für Mitnahme geschlossen", fr: "Établissement fermé pour Emporter" },
  storeClosedDesc: { it: "Siamo spiacenti, gli ordini da asporto sono chiusi in questo momento. Consulta i nostri orari di apertura qui sotto.", en: "We are sorry, takeaway orders are currently closed. Check our opening hours below.", de: "Es tut uns leid, Mitnahmebestellungen sind derzeit geschlossen. Öffnungszeiten sehen.", fr: "Désolé, les commandes à emporter sont actuellement fermées. Consultez nos horaires d'ouverture ci-dessous." },
  changePasswordMsg: { it: "Sei sicuro? Questa operazione riporterà la password a '1234'. Usala solo se hai dimenticato quella attuale.", en: "Are you sure? This operation will reset the password to '1234'. Use it only if you forgot the current one.", de: "Sind Sie sicher? Setzt das Passwort auf '1234' zurück. Nur verwenden, wenn Sie das aktuelle vergessen haben.", fr: "Êtes-vous sûr ? Cette opération réinitialisera le mot de passe à '1234'. Ne l'utilisez que si vous avez oublié l'actuel." },
  waiterCallsRecieved: { it: "Chiamate Cameriere Ricevute", en: "Waiter Calls Received", de: "Kellnerrufe erhalten", fr: "Appels du Serveur Reçus" },
  callHandled: { it: "Gestita", en: "Handled", de: "Geklärt", fr: "Géré" },
  noWaitOperator: { it: "Nessun operatore", en: "No operator", de: "Kein Bediener", fr: "Aucun opérateur" },
  savingHours: { it: "Salvataggio...", en: "Saving...", de: "Speichern...", fr: "Enregistrement..." },
  tablesSplitted: { it: "Tavoli divisi correttamente", en: "Tables successfully split", de: "Tische erfolgreich geteilt", fr: "Tables divisées avec succès" },
  errorTablesSplit: { it: "Errore nella divisione dei tavoli", en: "Error splitting tables", de: "Fehler beim Teilen der Tische", fr: "Erreur lors de la division des tables" }
};

const langs = ['it', 'en', 'de', 'fr'];

for (const lang of langs) {
  // Find the block for the language
  const regex = new RegExp(`(${lang}: \\{\\n(?:[\\s\\S]*?))(\\n\\s+\\})`, 'g');
  code = code.replace(regex, (match, p1, p2) => {
    let newProps = '';
    for (const key of Object.keys(additionalConfig)) {
      if (!p1.includes(`    ${key}:`)) {
        newProps += `,\n    ${key}: "${additionalConfig[key][lang].replace(/"/g, '\\"')}"`;
      }
    }
    return p1 + newProps + p2;
  });
}

fs.writeFileSync(path, code, 'utf8');
console.log('done');
