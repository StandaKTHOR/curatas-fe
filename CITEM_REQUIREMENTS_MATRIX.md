# CURATAS – Závazná matice požadavků CITEM (24. 9. 2026)

**Datum vyhotovení:** 3. října 2026  
**Status:** Schválená matice požadavků na základě zápisu CITEM–JDI ze dne 24. 9. 2026  
**Reference:** Původní systém DEMUS / Závěry z jednání Citem 24092026.docx  

---

## Přehledová tabulka požadavků

| ID | Požadavek | Oblast | Dopad na FE | Závislost na BE/DB | Odhad složitosti |
|---|---|---|---|---|---|
| **REQ-01** | DEMUS layout parity & informační hustota | UI/UX layout | Úprava mřížky a CSS | Žádná | Střední (M) |
| **REQ-02** | Permanentní identifikační hlavička | UI/UX detail & edit | Nová sticky komponenta | Žádná (data v detailu) | Střední (M) |
| **REQ-03** | Inventární číslo ze 3 komponent | Formulář & model | Rozdělení do 3 inputů + skládání | Žádná (syntéza do invNum) / DB změna pro rozdělené sloupce | Střední (M) |
| **REQ-04** | Nezávislá pole Fond a Podsbírka | Formulář & filtry | Rozdělení sloučeného pole | Žádná (BE již podporuje po V17) | Nízká–Střední (S-M) |
| **REQ-05** | Terminologie DEMUS (nahrazení „exponát“) | UI texty & hlášení | Textová revize v celém FE | Žádná | Nízká (S) |
| **REQ-06** | Duplicity polí (Markant, Signatura, Správci) | Formuláře & číselníky | Odstranění zdvojení, zachování textu | Částečná (kontrola DB migrace správců) | Nízká (S) |
| **REQ-07** | Povinná pole a validační pravidla | Validace formuláře | Inv. č. povinné, Přír. č. volitelné, Typ/Název | **KRITICKÁ BLOKACE BE** (BE vyžaduje title) | Střední (M) |
| **REQ-08** | Záložky, podzáložky a rozmístění polí | Navigace formuláře | Přesun polí (Zapsal atd.) na hlavní kartu | Žádná | Střední (M) |
| **REQ-09** | Pokročilé filtry (Zapsal, Určil, Fond) | Filtrování seznamu | Doplnění polí do filtru | **VYŽADUJE BE ZMĚNU** (ItemSpecification) | Střední–Vysoká (M-L) |
| **REQ-10** | Oboustranná paginace & přímý skok na stranu | Seznam & navigace | Horní + dolní paginace, input stránky, Zpět nahoře | Žádná | Nízká–Střední (S-M) |
| **REQ-11** | Tisk evidenční karty A5 na šířku (landscape) | Tiskové výstupy | Nová tisková šablona A5 + 2× A5 na A4 | Žádná (využívá existující tisková data) | Střední (M) |
| **REQ-12** | Stav a vizuální zpětná vazba exportu | Exporty | Spinner, disabled tlačítko, toast | Žádná | Nízká (S) |
| **REQ-13** | Odložená témata (Import, Feedback, Delete) | Backlog & governance | Ponechání stávajícího stavu, evidence | Závisí na externím rozhodnutí | Nízká (S) |

---

## Detailní specifikace požadavků

### REQ-01: DEMUS layout parity & informační hustota
- **Požadavek:** Zásadní přiblížení vizuálního a funkčního rozvržení původní aplikaci DEMUS. Odstranění nadbytečného bílého místa, minimalizace nutnosti vertikálního scrollování, zhuštění formulářových polí a tabulek.
- **Současná implementace:** Využití komponent `@gov-design-system-ce/react` s výchozími velkými rozestupy (`gap-4`, `p-6`, velké fonty, široké řádky).
- **Chybějící / chybné chování:** Na standardním monitoru (1920×1080) je nutné scrollovat pro zobrazení základních polí. Nízká hustota dat na obrazovce neodpovídá potřebám kurátora zvyklého na DEMUS.
- **Dotčené soubory:** `src/pages/AdminItemForm.tsx`, `src/pages/AdminItems.tsx`, `src/index.css`.
- **Závislosti na BE/DB:** Žádné.
- **Technická rizika:** Narušení responzivity pro menší tablety/notebooky při příliš agresivním pevném zmenšení.
- **Kritéria ověření:** Základní formulářová obrazovka zobrazuje klíčové identifikační údaje pohromadě; výška řádků v seznamu předmětů snížena na kompaktní úroveň (32–36 px); přehlednost pro kurátora bez nutnosti neustálého posunu myší.
- **Odhad složitosti:** Střední (M).
- **Nejasnosti / k dořešení:** Schválení tolerovaných odchylek od standardu Gov DS ve prospěch DEMUS hustoty.

---

### REQ-02: Permanentní identifikační hlavička
- **Požadavek:** Pevná (sticky/fixed) identifikační sekce v detailu a editaci předmětu, která zůstává trvale viditelná při procházení formuláře, scrollování i přepínání záložek. Musí obsahovat: **Fond, Předmět (Typ), Popis, Titul (Název), Autor, Datace**.
- **Současná implementace:** Hlavička formuláře v `AdminItemForm.tsx` (řádky 910–990) obsahuje pouze Název (pokud existuje), tlačítka akcí (Upravit, Publikováno, Tisk, Foto, Klonovat) a záložkovou lištu. Při posunu dolů odroluje pryč.
- **Chybějící / chybné chování:** Kurátor při práci na záložkách 2 až 5 nebo při scrollování delším formulářem nevidí klíčové identifikační atributy editovaného předmětu.
- **Dotčené soubory:** `src/pages/AdminItemForm.tsx`, `src/pages/Detail.tsx`, případně nová sdílená komponenta `src/components/PermanentIdentificationHeader.tsx`.
- **Závislosti na BE/DB:** Žádné. Všechna potřebná data jsou již přítomna v detailu předmětu (`ItemDetailDto` / `AdminItemDetail`).
- **Technická rizika:** Plovoucí/sticky hlavička nesmí překrývat editovatelná pole, modální okna ani drobečkovou navigaci; dlouhé texty (popis, titul) musí být inteligentně zkráceny (ellipsis/tooltip) s možností rozbalení.
- **Kritéria ověření:** Při scrollování zůstává hlavička přichycena k horní hraně viewportu pod hlavní lištou; zobrazuje přesně 6 požadovaných polí; žádné pole formuláře není překryto.
- **Odhad složitosti:** Střední (M).
- **Nejasnosti / k dořešení:** Žádné (mapování polí z existujícího API je 100% jednoznačné: Fond = `form.fundLegacyCode` / `form.fundDictionaryId`, Předmět = `form.objectType`, Popis = `form.description`, Titul = `form.title`, Autor = `form.author`, Datace = `form.datingText`).

---

### REQ-03: Inventární číslo ze tří komponent (Prefix / Hlavní číslo / Postfix)
- **Požadavek:** Inventární číslo musí být v uživatelském rozhraní editováno a reprezentováno jako 3 samostatné komponenty:
  1. Volitelný prefix (např. řada / lomení před).
  2. Hlavní pořadové číslo (číselná hodnota).
  3. Volitelný postfix (např. podlomení `/A`, `/1`).
- **Současná implementace:** Jediný celistvý textový vstup `<GovFormInput id="inventoryNumber" ... />`.
- **Chybějící / chybné chování:** Uživatel musí číslo ručně formátovat jako řetězec. Nelze efektivně třídit číselně ani filtrovat podle samostatné řady či podlomení.
- **Dotčené soubory:** `src/pages/AdminItemForm.tsx`, `src/lib/api.ts`, nová pomocná utilita pro parsování/syntézu inventárního čísla `src/lib/inventoryNumberUtils.ts`.
- **Závislosti na BE/DB:** 
  - *Front-endová syntéza (okamžitě realizovatelná):* Tři vstupní pole v UI se při odeslání spojí do existujícího sloupce `inventoryNumber` (např. `${prefix} ${number}${postfix ? '/' + postfix : ''}`). Existující historické hodnoty jsou parsovány bezpečně a nedestruktivně.
  - *Plná relační perzistence (budoucí BE krok):* Vyžadovala by migraci DB schématu (nové sloupce `inv_prefix`, `inv_main_number`, `inv_postfix`) a úpravu `ItemDtos`.
- **Technická rizika:** Riziko poškození historických nestandardních inventárních čísel při naivním dělení regexem. Viz podrobná analýza v `DATA_INTEGRITY_RISKS.md`.
- **Kritéria ověření:** Kurátor může zadat prefix, číslo i postfix odděleně; validace unikátnosti ověřuje složený tvar; nestandardní historická čísla nejsou oříznuta ani znehodnocena.
- **Odhad složitosti:** Střední (M).
- **Nejasnosti / k dořešení:** Potvrzení kanonického oddělovače pro skládání do stávajícího sloupce `inventoryNumber` před případnou změnou BE schématu.

---

### REQ-04: Nezávislá pole Fond a Podsbírka
- **Požadavek:** Fond a Podsbírka musí být dvě striktně oddělená a nezávislá pole v celém uživatelském rozhraní (ve formulářích, detailu, filtrech i tiskových sestavách).
- **Současná implementace:** `AdminItemForm.tsx` (řádky 1099–1120) má jediné pole s návěštím `Fond / Podsbírka`, které ukládá hodnotu do `form.subCollection`, ale jako možnosti nabízí `dicts.funds`.
- **Chybějící / chybné chování:** Zcela se smazal rozdíl mezi Fondem a Podsbírkou. Kurátor nemůže nastavit podsbírku nezávisle na fondu.
- **Dotčené soubory:** `src/pages/AdminItemForm.tsx`, `src/pages/AdminItems.tsx`, `src/components/AdvancedFilterBuilder.tsx`, `src/pages/Detail.tsx`, `src/lib/api.ts`.
- **Závislosti na BE/DB:** Backend již po migraci V17 (`fix/fund-subcollection-v17`) obě pole striktně odděluje: `fundDictionaryId` / `fundLegacyCode` vs. `subCollection`. BE je 100% připraven!
- **Technická rizika:** Zpětná kompatibilita při ukládání – je nutné správně posílat `fundDictionaryId` a `subCollection` v payloadu `CreateItemRequest` a `UpdateItemRequest`.
- **Kritéria ověření:** Ve formuláři existují dvě samostatná pole:
  1. *Fond:* Výběr z číselníku fondů (`dicts.funds` / `fundDictionaryId`).
  2. *Podsbírka:* Samostatné textové pole nebo selektor podsbírek (`subCollection`).
- **Odhad složitosti:** Nízká až Střední (S-M).
- **Nejasnosti / k dořešení:** Žádné.

---

### REQ-05: Původní terminologie DEMUS (nahrazení „exponát“)
- **Požadavek:** Důsledné odstranění termínu „exponát“ ze všech uživatelských rozhraní a jeho nahrazení odborně správným termínem **„sbírkový předmět“** nebo **„předmět“**.
- **Současná implementace:** Termín „exponát“ se vyskytuje v navigaci (`App.tsx`: `Správa exponátů`), v titulku stránky (`AdminItems.tsx`: `Správa exponátů`), v mazacím dialogu (`AdminItems.tsx`: `Opravdu chcete tento exponát trvale smazat?`) a v chybových hlášeních.
- **Chybějící / chybné chování:** Nedodržení muzejní terminologie; nevole ze strany kurátorů.
- **Dotčené soubory:** `src/App.tsx`, `src/pages/AdminItems.tsx`, `src/pages/AdminItemForm.tsx`, `src/pages/Catalog.tsx`, `src/pages/Detail.tsx`.
- **Závislosti na BE/DB:** Žádné (změna se týká výhradně uživatelského rozhraní; technické API identifikátory a URL cesty zůstávají netknuty).
- **Technická rizika:** Žádná.
- **Kritéria ověření:** Žádný uživatelský text v aplikaci neobsahuje slovo „exponát“ ani jeho tvary.
- **Odhad složitosti:** Nízká (S).
- **Nejasnosti / k dořešení:** Žádné.

---

### REQ-06: Duplicity polí (Markant, Signatura, Správci)
- **Požadavek:**
  1. Pole `Markant` a `Signatura` nesmí být duplikována ani prezentována jako číselníková pole; v DEMUS se jedná o volný text.
  2. Číselník správců sbírek: prošetřit počet správců – z DEMUS bylo přeneseno málo záznamů.
- **Současná implementace:** `markant` a `signature` jsou ve formuláři na záložce 1/2 a zároveň v `MuseumSection.tsx` na záložce 5. Správci se načítají z `GET /api/v1/dictionaries` (`spravci`).
- **Chybějící / chybné chování:** Zmatek kurátora, kam zadávat signaturu a markant.
- **Dotčené soubory:** `src/pages/AdminItemForm.tsx`, `src/components/MuseumSection.tsx`.
- **Závislosti na BE/DB:** Pro Markant/Signaturu žádná. Pro správce: BE vrací sloučené hodnoty z `core.dictionary` (`SPRAVCE`) a existujících položek `core.item.spravce`. Pokud v DEMUS Access databázi bylo více správců, je to úloha pro doimportování do číselníku na BE.
- **Technická rizika:** Neúmyslné smazání vazby při editaci.
- **Kritéria ověření:** Markant a Signatura jsou editovány pouze na jednom logickém místě jako volný text; změny se ukládají přímo do `ItemEntity.markant` a `signature`.
- **Odhad složitosti:** Nízká (S).
- **Nejasnosti / k dořešení:** Ověření, na které záložce kurátoři preferují Markant a Signaturu (v DEMUS byly na hlavní kartě popisu).

---

### REQ-07: Povinná pole a validační pravidla
- **Požadavek:**
  1. **Inventární číslo MUSÍ být povinné.**
  2. **Přírůstkové číslo NESMÍ být povinné.**
  3. **Alespoň jedno z polí Typ předmětu (`objectType`) a Název předmětu (`title`) MUSÍ být vyplněno.**
- **Současná implementace:** 
  - Přírůstkové číslo je povinné (`required`, řádek 1039 v `AdminItemForm.tsx`).
  - Inventární číslo je volitelné.
  - V `handleSubmit` je podmínka: `if (!currentInv && !currentAcc) { chyba... }`.
- **Chybějící / chybné chování:** Přesný opak schváleného stavu. Kurátor nemůže uložit předmět bez přírůstkového čísla, a naopak systém dovolí uložit předmět bez inventárního čísla.
- **Dotčené soubory:** `src/pages/AdminItemForm.tsx`.
- **Závislosti na BE/DB:** **ZÁSADNÍ NÁLEZ / BE BLOKACE:**
  - V `cz.curatas.dto.ItemDtos.CreateItemRequest` je pole `title` opatřeno anotací `@NotBlank(message = "Title is required")`.
  - Pokud kurátor zadá pouze Typ předmětu (např. „Mince“) a pole Název (`title`) nechá prázdné, backend vyhodí chybu validace HTTP 400 Bad Request!
  - *Front-endové přemostění (workaround do úpravy BE):* Pokud uživatel zadá `objectType` a nevyplní `title`, FE dočasně zkopíruje hodnotu `objectType` do `title` (v souladu s logikou migrace v `DemusItemMapper.java`).
  - *Trvalé řešení:* Odstranění `@NotBlank` z `title` v BE `CreateItemRequest` a přidání custom validátoru ověřujícího `title != null || objectType != null`.
- **Technická rizika:** Riziko, že formulář projde klientskou validací, ale server jej odmítne.
- **Kritéria ověření:** Formulář neumožní odeslání bez inventárního čísla; dovolí odeslání bez přírůstkového čísla; dovolí odeslání, pokud je vyplněn alespoň typ nebo název.
- **Odhad složitosti:** Střední (M).
- **Nejasnosti / k dořešení:** Schválení FE přemostění pro `title` do doby nasazení opravy BE.

---

### REQ-08: Záložky, podzáložky a rozmístění polí
- **Požadavek:** Uspořádat pole tak, aby odpovídala původní logice DEMUS. Přesunout klíčová evidenční pole z vedlejších záložek na hlavní obrazovku. Pole **Zapsal** nesmí být skryté pouze jako read-only hodnota v hloubi muzejních záložek, pokud patřilo jinam. Žádná zadaná data se nesmí ztratit při přepínání záložek.
- **Současná implementace:** Pole jsou rozprostřena v 5 záložkách. Pole `Zapsal v DEMUS` je dostupné pouze na záložce 5 pod podzáložkou `history` v `MuseumSection.tsx`.
- **Chybějící / chybné chování:** Původní metadata o zapsání a určení předmětu nejsou snadno dostupná na primární kartě.
- **Dotčené soubory:** `src/pages/AdminItemForm.tsx`, `src/components/MuseumSection.tsx`.
- **Závislosti na BE/DB:** Žádné. `legacyCreatedBy` je součástí `ItemEntity` a detailu `ItemDetailDto`.
- **Technická rizika:** Ztráta neuložených dat při přepnutí záložky. (Ve FE je celý stav držen v React `form` state, takže přepínání záložek data nemaže, je však nutné zachovat tento princip i pro nově přidané komponenty).
- **Kritéria ověření:** Pole Zapsal/Zapsáno je zobrazeno na hlavní identifikační/evidenční záložce; data zůstávají zachována při libovolném přepínání záložek.
- **Odhad složitosti:** Střední (M).
- **Nejasnosti / k dořešení:** Přesné vizuální umístění pole Zapsal na primární obrazovce (doporučeno do sekce Správa / Auditní metadata).

---

### REQ-09: Pokročilé vyhledávání a filtrování (Zapsal, Určil, Fond)
- **Požadavek:** Rozšířit vyhledávání a filtry o chybějící historická pole, zejména **Zapsal** a **Určil**. Cílem je možnost filtrovat podle všech relevantních evidovaných údajů.
- **Současná implementace:** `AdvancedFilterBuilder.tsx` má 24 polí, ale chybí v něm `zapsal`, `urcil` i samostatný `fond`. Rychlé filtry v `AdminItems.tsx` obsahují pouze `subCollection`.
- **Chybějící / chybné chování:** Kurátoři nemohou dohledat předměty zapsané konkrétním pracovníkem nebo určené konkrétním znalcem.
- **Dotčené soubory:** `src/components/AdvancedFilterBuilder.tsx`, `src/pages/AdminItems.tsx`, `src/lib/api.ts`.
- **Závislosti na BE/DB:** **VYŽADUJE BE IMPLEMENTACI PRO PLNÉ SERVER-SIDE VYHLEDÁVÁNÍ:**
  - V `cz.curatas.dto.ItemSearchRequest` chybí gettery/settery pro `zapsal`, `urcil`, `fond`.
  - V `cz.curatas.repository.ItemSpecification.normalizeFieldName` nejsou tyto názvy polí mapovány a `buildConditionPredicate` je zahodí.
  - Pro pole `zapsal` existuje sloupec `legacy_created_by` v `core.item`.
  - Pro pole `urcil` existují záznamy v `ItemMuseumRecordEntity` (`kind = 'DETERMINATION'`, payload `Urcil_UR` a vazba na `ItemPartyEntity`).
  - Pro pole `fond` existuje `fund_dictionary_id` a `fund_legacy_code`.
- **Technická rizika:** Klientské filtrování nad stránkovaným výsledkem (50 položek) by bylo hrubě matoucí a nefunkční pro dataset o statisících záznamů. Filtrování musí probíhat na serveru.
- **Kritéria ověření:** Po doplnění BE podpory může uživatel zadat podmínku `Zapsal = 'NOVAK'` nebo `Určil obsahuje 'Svoboda'` a server vrátí správnou sadu výsledků.
- **Odhad složitosti:** Střední až Vysoká (M-L) kvůli nutnosti BE zásahu.
- **Nejasnosti / k dořešení:** Termín implementace BE rozšíření `ItemSpecification.java` pro `zapsal`, `urcil` a `fond`.

---

### REQ-10: Stránkování a navigace (oboustranné, přímý skok, návrat)
- **Požadavek:**
  1. Ovládací prvky stránkování nahoře i dole nad a pod tabulkou.
  2. Přímé editovatelné pole s číslem stránky umožňující okamžitý přechod na požadovanou stranu.
  3. Bezchybné ošetření neplatných a přesažených hodnot (out-of-range).
  4. Vzájemná synchronizace obou prvků stránkování.
  5. Obnova aktuální stránky, filtrů a řazení při návratu z detailu/editace.
  6. Viditelná akce „Zpět na seznam“ v horní části obrazovky předmětu.
  7. Zákaz načítání celého datasetu do paměti prohlížeče (zachování server-side paginace).
- **Současná implementace:** 
  - Paginace pouze v patičce tabulky v `AdminItems.tsx`.
  - Žádné editovatelné pole (pouze statický text).
  - Tlačítko „Zpět na seznam“ je pouze v patičce formuláře `AdminItemForm.tsx`.
- **Chybějící / chybné chování:** Nutnost zdlouhavého klikání „Další“ pro přechod na vzdálené stránky; po návratu z editace zdlouhavé hledání tlačítka zpět.
- **Dotčené soubory:** `src/pages/AdminItems.tsx`, `src/pages/AdminItemForm.tsx`, nová komponenta paginace `src/components/PaginationControls.tsx`.
- **Závislosti na BE/DB:** Žádné (BE již podporuje standardní Spring Data `Pageable` s parametry `page` a `size`).
- **Technická rizika:** Zacyklení aktualizace URL parametrů při nekorektním zpracování vstupu.
- **Kritéria ověření:** Paginace je nahoře i dole; zadáním např. „15“ a stiskem Enter přejde tabulka na stranu 15; neplatná čísla jsou automaticky opravena na meze (1 až maxPage); akce „Zpět na seznam“ v záhlaví editace spolehlivě vrátí uživatele na původní stránku seznamu s aktivními filtry.
- **Odhad složitosti:** Nízká až Střední (S-M).
- **Nejasnosti / k dořešení:** Žádné.

---

### REQ-11: Oficiální muzejní tiskové sestavy (A5 landscape evidenční karta)
- **Požadavek:** 
  1. Implementace tiskové sestavy **Evidenční karta DEMUS ve formátu A5 na šířku (landscape)**.
  2. Příprava varianty uspořádání dvou A5 karet na jeden list A4 (s obrázkem i bez obrázku).
  3. Zachování stávajícího funkčního A4 tisku karty a A4 inventárního soupisu (nevydávat A4 za splnění A5).
- **Současná implementace:** `MuseumCardPrint.tsx` a `ItemListPrint.tsx` jsou výhradně A4 na výšku.
- **Chybějící / chybné chování:** Absence standardního muzejního tiskového formátu A5 landscape předepsaného metodikou.
- **Dotčené soubory:** Nová komponenta `src/components/MuseumCardPrintA5.tsx`, rozšíření `src/pages/AdminItemForm.tsx`, `src/pages/AdminItems.tsx`, tiskové CSS pravidla `@page { size: A5 landscape; margin: 8mm; }`.
- **Závislosti na BE/DB:** Žádné (data jsou k dispozici přes stávající endpointy detailu).
- **Technická rizika:** Přetečení textu na druhou stranu při pevném rozměru A5; ořez fotografií; chování tiskových ovladačů prohlížeče.
- **Kritéria ověření:** Tiskový dialog prohlížeče automaticky nastaví orientaci na šířku a formát A5; obsah se přesně vejde na jeden list A5 bez nechtěného přetečení na prázdnou druhou stranu; existující A4 tisk zůstává nedotčen a plně funkční.
- **Odhad složitosti:** Střední (M).
- **Nejasnosti / k dořešení:** Přesná grafická předloha (screenshot či scan) původní DEMUS A5 karty pro 100% pixel-perfect shodu rozvržení rámečků a podpisových polí.

---

### REQ-12: Stav a vizuální zpětná vazba exportu
- **Požadavek:** Uživatel musí jednoznačně vidět, že požadovaný export běží (viditelný spinner / indikátor nahrávání, deaktivace tlačítka proti duplicitnímu kliknutí, hlášení o dokončení nebo chybě). Zákaz simulace úspěchu.
- **Současná implementace:** V `AdminItems.tsx` (řádky 195–211) se pouze zavolá `exportItemsToExcel(queryParams)`. Tlačítko zůstává aktivní, neexistuje žádný indikátor průběhu.
- **Chybějící / chybné chování:** Uživatel netuší, zda se něco děje, kliká opakovaně a přetěžuje backend.
- **Dotčené soubory:** `src/pages/AdminItems.tsx`, `src/lib/api.ts`.
- **Závislosti na BE/DB:** Žádné.
- **Technická rizika:** Žádná.
- **Kritéria ověření:** Po kliknutí na „Export .xlsx“ se tlačítko deaktivuje, zobrazí se rotující ikona a text „Generuji export...“; po stažení souboru se stav resetuje a zobrazí se notifikace o úspěšném stažení; při chybě se zobrazí srozumitelná chybová zpráva.
- **Odhad složitosti:** Nízká (S).
- **Nejasnosti / k dořešení:** Žádné.

---

### REQ-13: Odložená témata (Import, Feedback, Delete, DataKat.mdb)
- **Požadavek:**
  - *Import:* Odložen na samostatné jednání po nasazení UAT za účasti firmy Abuco.
  - *Zpětná vazba správcům:* Proces a funkčnost odloženy.
  - *Mazání (Delete):* Vyčkat na vyjasnění od CITEM ohledně přesného účelu a chování této akce.
  - *Originální DataKat.mdb:* Oddělený úkol mimo běžné FE obrazovky.
- **Současná implementace:** Importní modul existuje v `src/features/import`, feedback v `src/pages/Feedback.tsx`, mazání v `AdminItems.tsx` s potvrzovacím dialogem a zápisem do auditní stopy.
- **Chybějící / chybné chování:** Tato témata nesmí být předčasně svévolně měněna ani znovunavrhována bez závazného zadání.
- **Dotčené soubory:** Všechny související komponenty zůstávají v konzervativním režimu.
- **Závislosti na BE/DB:** Externí organizační a procesní rozhodnutí.
- **Technická rizika:** Žádná, pokud se do nich nebude svévolně zasahovat.
- **Kritéria ověření:** Funkcionality jsou evidovány v backlogu; stávající bezpečnostní a autorizační pravidla zůstávají nedotčena.
- **Odhad složitosti:** Nízká (S).
- **Nejasnosti / k dořešení:** Čekání na oficiální stanovisko CITEM / Abuco.
