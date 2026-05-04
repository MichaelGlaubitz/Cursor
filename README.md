# Unterrichtsmanager 6c

Diese Anwendung verwaltet die Leistungsdaten der Klasse 6c.

## Plickers-Verbindung

Plickers bietet derzeit keinen frei dokumentierten öffentlichen API-Zugang.
Der zuverlässige Weg für den Datenabruf ist:

1. In `plickers.com` anmelden.
2. In die `Scoresheet`-Ansicht wechseln.
3. Klasse und Zeitraum einstellen.
4. `Export Data to CSV` ausführen.
5. CSV-Datei in dieser App importieren.

## Funktionen

- Import von Plickers-Leistungsdaten über CSV-Datei oder Copy/Paste.
- Robuste CSV-Erkennung (Komma/Semikolon/Tabulator, Header optional).
- Automatische Kennzahlen (Durchschnitt, Beste Leistung, Förderbedarf).
- Sortierte Schülerübersicht mit Leistungs-Hinweisen.
- Lokale Speicherung im Browser für den letzten Importstand.
