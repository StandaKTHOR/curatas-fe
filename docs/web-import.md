# WEB import dat

Obrazovka `/admin/import` je součástí stávající chráněné administrace. Používá React, TypeScript, existující Button, HTML formulář, tabulku a progress. Texty a formátovací locale jsou v `src/features/import/texts.ts`.

## Stav integrace

V dostupném sousedním projektu `curatas-be-fat` byly nalezeny pouze `ImportDtos.java`, `ImportStatus.java` a `PageDto.java`, nikoli import controller. TypeScript DTO kopírují tyto definice. Následující HTTP mapování je **návrh k potvrzení, nikoli ověřené backend API**. Před nasazením je nutné upravit `src/features/import/api.ts` podle skutečného controlleru. Testy s mocky neověřují kompatibilitu se spuštěným backendem.

| Operace | Navržený endpoint pod `/api/v1/imports` | Odpověď |
| --- | --- | --- |
| Založení | POST `/` (bez koncového lomítka v adaptéru) | ImportCreateResponse |
| Upload | POST `/{id}/file`, multipart pole `file` | libovolná úspěšná odpověď |
| Validace | POST `/{id}/validate` | libovolná úspěšná odpověď |
| Příprava | POST `/{id}/ready`, ReadyRequest | libovolná úspěšná odpověď |
| Import | POST `/{id}/start` | libovolná úspěšná odpověď |
| Stav | GET `/{id}/status` | ImportStatusResponse |
| Chyby | GET `/{id}/errors?page=0&size=50` | ImportErrorPage s vnořeným PageDto |

Autorizace používá stejný bearer token a API_BASE jako zbytek aplikace. Časový limit jednotlivého requestu je 30 sekund. Zápisové požadavky se neopakují automaticky. Stav se načítá postupně po 2 sekundách, bez překrývání požadavků, a polling končí při INVALID, FAILED, COMPLETED nebo COMPLETED_WITH_ERRORS. Při výpadku uživatel obnoví načítání stavu tlačítkem. Probíhající požadavky se při odchodu ruší; serverový import tím není zrušen.

ID je v query parametru `importId`, aby bylo možné obnovit sledování po reloadu. Opravený soubor zakládá nový import. FE soubor neparsuje a nekopíruje validační pravidla. Import se nabízí pro VALID/READY; příprava posílá `allowValidationErrors: false`. Výsledné oprávnění provést přechod vynucuje backend.

## Chybějící backendová data

DTO obsahuje `totalRecords`, `validRecords`, `errorRecords`, `importedRecords`. Neobsahuje počty zpracovaných, přeskočených a neúspěšně importovaných záznamů ani datum nahrání. `errorRecords` je validační počet a nelze jej vydávat za failed při importu. `createdAt` je datum založení importu. UI proto u chybějících hodnot uvádí „Není k dispozici“ a vysvětlení. Progress je neurčitý, s konkrétním stavem serveru; procenta se nevymýšlejí. Pro dokončení integračních požadavků musí backend dodat tyto údaje a jejich význam, následně se doplní DTO a zobrazení.

## Ověření

`npm test`, `npm run typecheck`, `npm run build`.

Testy obrazovky ověřují výběr a upload, asynchronní validaci, validační chyby a stránkování, opravu souboru, start a polling importu, dokončení, výpadek serveru, chyby oprávnění, retry seznamu chyb a rušení požadavků. Testy adaptéru pokrývají multipart, autorizaci, stránkování a neopakování POSTu.
