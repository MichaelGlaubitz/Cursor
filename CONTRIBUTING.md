# Contributing

## Merge-Konflikt-Checkliste (Dashboard)

Nutze diese kurze Checkliste, wenn es Konflikte in `index.html`, `app.js` oder `styles.css` gibt.

1. **Konflikttyp klassifizieren**
   - *Einfach:* gleiche Stelle, aber kombinierbare Ergänzungen (z. B. neues Select-Feld + bestehendes Layout).
   - *Komplex:* widersprüchliche Produktentscheidung oder inkompatible Logikpfade.

2. **UI-Struktur in `index.html` prüfen**
   - Wurden neue Felder/Buttons sauber in den `.controls`-Bereich integriert?
   - Stimmen IDs mit `app.js` überein (z. B. `#description-mode-select`)?

3. **Event-Flow in `app.js` absichern**
   - Existiert für neue Controls ein Event-Listener in `bootstrap()`?
   - Führt das Event zu `updateFilteredView()` oder dem korrekten Renderpfad?

4. **Render-Logik vereinheitlichen**
   - Enthält `renderRepoCards()` alle gewünschten Modi (z. B. Auto-Zusammenfassung vs. Originalbeschreibung)?
   - Werden Fallback-Texte bei fehlenden Daten sauber angezeigt?

5. **CSS-Konsistenz verifizieren**
   - Stimmen Klassennamen zwischen HTML und CSS überein?
   - Gibt es Doppeldefinitionen oder veraltete Klassen nach dem Merge?

6. **Konfliktmarker und Git-Status prüfen**
   - Sicherstellen, dass keine Marker mehr vorhanden sind:
     - `<<<<<<<`
     - `=======`
     - `>>>>>>>`
   - Danach `git add` + Merge-Commit.

7. **Kurztest vor Push**
   - Dashboard laden.
   - Suche/Sortierung testen.
   - Beschreibungsmodus umschalten und Rendering prüfen.
