# <ID> – <Titel>

**Phase:** <n> · **Priorität:** P<n> · **Komponente(n):** APP/TERM/SSH/RDP/LOC/… · **Abhängigkeiten:** <IDs>

## Ziel
Ein bis zwei Sätze: Was kann der Nutzer danach?

## Verhalten aus Nutzersicht
In eigenen Worten (keine Texte aus fremder Doku oder Oberfläche). Abläufe, Dialoge, Standardwerte.

## Abweichungen vom Vorbild
Bewusste Unterschiede und warum (z. B. Sicherheit, technische Grenzen). „Keine“ ist eine gültige Antwort.

## Akzeptanzkriterien
- [ ] … (prüfbar formuliert)
- [ ] …

## Technischer Ansatz
- Betroffene Units/Dateien
- Neue Tauri-Befehle, Kanäle, Ereignisse – auch im Skill `tauri-schnittstelle` eintragen
- Neue Konfigurationsfelder (Name, Typ, Standard)
- Verwendete APIs/Bibliotheken mit Quelle (docs.rs, context7, microsoft-learn, Protokoll-RFC)

## Sicherheit
Geheimnisse, Host-Keys, Eingabevalidierung, Rechte, Netzwerk.

## Tests
- Unit (`cargo test`, Vitest): …
- Integration (Testserver aus `testing/`): …
- Oberfläche (Screenshot in der Cloud): …
- Nur unter Windows (Checkliste): …

## Offene Fragen
- …
