# CURATAS – Analýza rizik datové integrity a scénáře ztráty dat

**Datum vyhotovení:** 3. října 2026  
**Oblast:** Datová integrita, perzistence, validace a migrační bezpečnost  
**Status:** Závazná bezpečnostní analýza pro implementaci závěrů CITEM  

---

## 1. Úvodní zhodnocení rizik

Muzejní evidence sbírek podléhá zákonu č. 122/2000 Sb. o ochraně sbírek muzejní povahy. Jakákoliv ztráta, nechtěná modifikace či poškození evidenčních dat (zejména inventárních čísel, vazeb na fondy a původních zápisů) představuje nejen technický, ale i právní a auditní incident.

Tento dokument detailně analyzuje identifikovaná technická rizika a stanovuje závazné zásady a mitigace pro zabránění ztrátě či zkreslení dat.

---

## 2. Katalog rizik a scénáře ztráty dat

### R-01: Destruktivní dekompozice a syntéza inventárních čísel
- **Popis rizika:**
  Požadavek CITEM stanoví, že inventární číslo musí být reprezentováno 3 samostatnými UI prvky:
  1. *Prefix (řada)*
  2. *Hlavní pořadové číslo*
  3. *Postfix (podlomení)*

  V databázi `core.item` však existuje pouze jediný sloupec `inventory_number` typu `VARCHAR(255)`. Historická data z DEMUSu byla při migraci převedena do rozmanitých textových formátů, např.:
  - Standardní: `1234`, `A 5678`, `E 12/A`
  - Členěná lomením: `1234/1`, `1234/1998`, `P 56/12/B`
  - Nestandardní / složená: `M-45/a,b`, `S-IV-1205`, `INV.Č. 789`, `Přír. 12/85`, `Neznámé`
  - Čísla s mezerami a římskými číslicemi: `Rada II 456 / C`

- **Scénář ztráty dat:**
  Pokud by frontend použil zjednodušený regulární výraz (např. předpokládající pouze čísla nebo jedno písmeno) a pokusil se stávající řetězec rozdělit, u nestandardního čísla by mohl:
  1. Zahodit část textu (např. postfix `/a,b` by byl oříznut).
  2. Nesprávně přesunout část čísla do prefixu.
  3. Při následném uložení odeslat na backend zmrzačený řetězec, čímž by trvale přepsal původní úřední inventární číslo!

- **Mitigační strategie (Zásada nedestruktivního fallbacku):**
  1. **Algoritmus bezpečného parsování:**
     - Pokud číslo odpovídá striktnímu formátu `^[prefix]\s+[číslo](/[postfix])?$`, rozdělí se do 3 polí.
     - Pokud číslo obsahuje pouze číslici a volitelný prefix, rozdělí se korektně.
     - **V případě jakékoliv nejistoty nebo nestandardního formátu:** Celý původní řetězec se bez úprav vloží do pole *Hlavní číslo* (a prefix i postfix zůstanou prázdné), nebo se uživateli zobrazí přepínač „Nestandardní formát – přímá editace celého čísla“.
  2. **Syntéza při odeslání:**
     - Výsledný řetězec se skládá přesně podle zadaných neprázdných částí:
       `[Prefix] [HlavníČíslo]/[Postfix]`.
  3. **Předvyplnění původní hodnoty při rušení:**
     - Pokud uživatel maže nebo mění inventární číslo, zobrazí se varovný dialog potvrzující změnu úředního čísla.

---

### R-02: Porušení integrity vazby Fondu a Podsbírky
- **Popis rizika:**
  V historii projektu došlo migrací V16 k chybnému sloučení podsbírek a fondů (podsbírky byly vloženy do číselníku fondů a provázány s položkami).
  V backendové migraci V17 (`V17__repair_fund_and_subcollection_mappings.sql`) byla tato chyba náročně sanována a obě entity byly striktně odděleny na základě autoritativního kódu fondu z DEMUS (`fund_legacy_code`).

- **Scénář ztráty dat:**
  Současný frontend v [AdminItemForm.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/AdminItemForm.tsx#L1099-L1120) má jediné pole `Fond / Podsbírka`, které ukládá hodnotu do pole `subCollection`.
  Pokud by kurátor upravil toto sloučené pole:
  - Do pole `sub_collection` by se uložil název fondu (např. „Numismatika“), čímž by se přepsala skutečná podsbírka.
  - Skutečná vazba na fond (`fund_dictionary_id`) by zůstala nezměněna nebo by byla při neopatrné manipulaci vynulována (`clearFund = true`).

- **Mitigační strategie:**
  1. **Striktní fyzické oddělení prvků ve formuláři:**
     - Pole **Fond:** Samostatný selektor svázaný s `form.fundDictionaryId` a číselníkem `dict_type = 'FUND'`.
     - Pole **Podsbírka:** Samostatné textové pole/selektor svázané výhradně s `form.subCollection`.
  2. **Ochrana payloadu:**
     - V `buildItemPayload` se hodnota `subCollection` posílá do klíče `subCollection` a hodnota fondu do klíče `fundDictionaryId`.
     - Pole `clearFund` se posílá jako `true` POUZE tehdy, pokud kurátor explicitně vybral možnost „— Bez fondu —“.

---

### R-03: Klientská validace vs. odmítnutí serverem (Title `@NotBlank`)
- **Popis rizika:**
  Požadavek CITEM stanoví, že musí být vyplněn alespoň *Typ předmětu* (`objectType`) NEBO *Název předmětu* (`title`).
  Backendový DTO model `CreateItemRequest` v [ItemDtos.java](file:///D:/ProjektyJava/IdeaProjects/curatas-be/src/main/java/cz/curatas/dto/ItemDtos.java#L136) však obsahuje validační anotaci:
  `@NotBlank(message = "Title is required") String title`.

- **Scénář ztráty dat:**
  Pokud kurátor zakládá nový sbírkový předmět, vyplní všechna pole včetně typu (např. „Archeologický nález“), ale název nevyplní, klientská validace podle nových pravidel CITEM formulář propustí.
  Server následně odpoví kódem HTTP 400 Bad Request. Pokud by aplikace chybu neošetřila správně nebo reloadovala stránku, kurátor by přišel o veškerá vyplněná data.

- **Mitigační strategie:**
  1. **Frontend přemostění (Bridge Workaround):**
     Při sestavování payloadu v `buildItemPayload`:
     ```typescript
     const resolvedTitle = (currentForm.title && currentForm.title.trim())
         ? currentForm.title.trim()
         : (currentForm.objectType && currentForm.objectType.trim() ? currentForm.objectType.trim() : '');
     ```
     Pokud je `title` prázdný a je zadán `objectType`, FE dočasně použije hodnotu `objectType` jako `title`. Toto chování přesně odpovídá logice z `DemusItemMapper.java` (`firstNonBlank(Titul_S, Predmet_S, invNum)`).
  2. **Zachování stavu formuláře:**
     Při jakékoliv chybě serveru (400, 409, 500) zůstávají všechna pole formuláře plně zachována v lokálním React stavu; zobrazí se srozumitelná notifikace s vyznačením chybného pole.

---

### R-04: Ztráta rozpracovaných dat při přepínání záložek
- **Popis rizika:**
  Formulář sbírkového předmětu má 5 hlavních záložek a vícero podzáložek. Uživatel zadává data postupně a přepíná mezi záložkami.

- **Scénář ztráty dat:**
  Pokud by komponenty pod jednotlivými záložkami držely svůj vlastní izolovaný stav a při odpojení z DOMu (unmount) by se stav zničil, uživatel by po přechodu na jinou záložku a návratu zpět ztratil všechny neuložené úpravy.

- **Mitigační strategie:**
  1. Veškerý formulářový stav je centralizován v kořenové komponentě `AdminItemForm.tsx` v objektu `form`.
  2. Přepínání záložek pouze podmíněně skrývá/zobrazuje sekce, aniž by docházelo k resetu kořenového stavu.
  3. Modál pro muzejní data `MuseumSection.tsx` provádí synchronizaci přes `handleSectionSave`, která bezpečně sloučí nově uložené muzejní záznamy, aniž by přepsala rozpracovaná textová pole hlavního formuláře.

---

### R-05: Nekonzistence stavu při návratu z detailu do seznamu
- **Popis rizika:**
  Kurátor pracuje se seznamem 100 000 předmětů. Nastaví filtry (např. Fond = „Numismatika“, Autor = „Neznámý“), nalistuje stranu 18 a otevře detail 3. předmětu.

- **Scénář ztráty produktivity / riziko chybné evidence:**
  Pokud po návratu z detailu tlačítkem „Zpět na seznam“ dojde k resetu na stranu 1 a vymazání filtrů, kurátor ztratí kontext své práce a hrozí, že přehlédne nezkontrolované předměty nebo omylem zopakuje akci na špatném záznamu.

- **Mitigační strategie:**
  1. Parametry vyhledávání (filtry, řazení, číslo stránky) jsou uloženy v URL adrese a zrcadleny v `sessionStorage.getItem('adminItemsSearch')`.
  2. Tlačítko „Zpět na seznam“ (umístěné v záhlaví i zápatí) explicitně naviguje na `/admin/items` s původním query stringem.

---

### R-06: Výkonové přetížení a OOM při hromadném tisku nebo exportu
- **Popis rizika:**
  U rozsáhlých datových sad (desítky až stovky tisíc předmětů) může požadavek na tisk nebo export vyčerpat paměť prohlížeče nebo způsobit pád serveru.

- **Mitigační strategie:**
  1. **Tisk:** Pevný ochranný limit v `searchPrintItems` (max 500–1000 položek v tiskovém náhledu s varováním uživateli).
  2. **Export:** Backend v [InternalItemController.java](file:///D:/ProjektyJava/IdeaProjects/curatas-be/src/main/java/cz/curatas/controller/InternalItemController.java#L79-L89) kontroluje `totalCount > maxExportItems (100 000)`. Pokud je překročen, vyhodí HTTP 422 s požadavkem na zpřesnění filtru.
  3. **Export na FE:** Během exportu je tlačítko zablokováno (`disabled`) a je zobrazen spinner, což zamezuje spuštění paralelních náročných dotazů.

---

## 3. Závěr pro implementaci

Všechna identifikovaná rizika mají definovanou jasnou technickou mitigaci. Implementace tříprvkového inventárního čísla i oddělení fondu a podsbírky proběhne striktně nedestruktivním způsobem se zachováním 100% integrity historických dat z DEMUSu.
