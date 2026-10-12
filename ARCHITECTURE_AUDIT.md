# CURATAS – Technický audit architektury frontendu (CITEM 24. 9. 2026)

**Datum auditu:** 3. října 2026  
**Autor:** Senior React/TypeScript & Software Architecture Engineer  
**Projekt:** CURATAS (MESonline) Frontend  
**Výchozí stav FE:** Větev `fix/uat-subpath`, commit `b249362cefddba581e9f35aa01f90b5bc0dff3ac`  
**Výchozí stav BE:** Větev `fix/fund-subcollection-v17`, commit `c140d1b402c9482046e1068a1791e090b67be291`  
**Status auditu:** Read-Only technický audit a analýza připravenosti pro DEMUS paritu

---

## 1. Manažerské shrnutí auditu

Tento audit byl proveden v režimu **čtení bez modifikace** kódu, konfigurací či databází. Cílem bylo detailně zmapovat aktuální stav frontendové aplikace `curatas-fe`, porovnat jej se závaznými závěry jednání CITEM–JDI ze dne 24. 9. 2026 a historickým systémem DEMUS a identifikovat přesná místa vyžadující úpravu, backendové závislosti, integrity rizik a plán fázované implementace.

### Hlavní zjištění:
1. **Zhutnění layoutu (DEMUS parita):** Aplikace je postavena na komponentách Gov Design Systemu ČR (`@gov-design-system-ce/react`), které mají ze své podstaty velkorysé odsazení, velké fonty a nízkou informační hustotu. Pro splnění požadavků kurátorů na DEMUS paritu je nutné vytvořit kompaktní, informačně husté zobrazení bez zbytečného plýtvání místem.
2. **Permanentní identifikační hlavička:** Aktuálně zcela chybí. Kurátor při přepínání záložek a scrollování formulářem ztrácí kontext o tom, jaký předmět edituje (Fond, Předmět, Popis, Titul, Autor, Datace).
3. **Inventární číslo (3 komponenty):** FE i BE v současnosti pracují pouze s jediným celistvým textovým řetězcem `inventoryNumber`. Tříprvkové členění (prefix / pořadové číslo / postfix) existovalo pouze v historických Access datech DEMUS (`Rada_S`, `PorC_S`, `Lomeni_S`), které byly při migraci spojeny.
4. **Fond a Podsbírka:** V FE formuláři (`AdminItemForm.tsx`) jsou obě entity chybně sloučeny do jediného selektoru „Fond / Podsbírka“, který zapisuje do pole `subCollection`. Přitom BE migrací V17 striktně oddělil nezávislý fond (`core.item.fund_dictionary_id` typu `FUND`) a podsbírku (`core.item.sub_collection`).
5. **Povinná pole a validace:** FE má kriticky chybně nastavenou validaci – vyžaduje Přírůstkové číslo jako povinné a Inventární číslo jako nepovinné. Závěr CITEM stanovil pravý opak: Inventární číslo musí být povinné, Přírůstkové číslo nepovinné. Dále musí být vyplněn alespoň Typ předmětu nebo Název. Backend však při zakládání striktně vyžaduje `@NotBlank title`, což představuje BE blokaci při zadání pouze Typu bez Názvu.
6. **Paginace a navigace:** V seznamu předmětů existuje paginace pouze dole, chybí horní ovládací prvky a chybí možnost přímého zadání čísla stránky. Tlačítko „Zpět na seznam“ je ve formuláři až na samém konci po tisících řádků polí.
7. **Tiskové sestavy:** Existuje pouze A4 tisk karty předmětu a A4 tisk inventárního soupisu. Chybí stěžejní požadavek muzea – **evidenční karta formátu A5 na šířku (landscape)** a varianta 2× A5 na listu A4.
8. **Export do Excelu:** Během generování exportu (který u velkých kolekcí může trvat desítky sekund) chybí viditelný indikátor průběhu, což vede k opakovaným kliknutím a zmatení uživatele.

---

## 2. Architektura frontendu

### 2.1 Technologický stack
- **Jádro:** React 18.3.1, TypeScript 5.6.2, Vite 7.3.1.
- **Styling:** Tailwind CSS 3.4.19, Bootstrap utility třídy (legacy vrstva `bootstrap.css`), `@gov-design-system-ce/styles` (design systém státní správy).
- **Komponenty:** `@gov-design-system-ce/react` v4.7.0, Radix UI primitives (`@radix-ui/react-label`, `@radix-ui/react-slot`), `lucide-react`, `react-icons`.
- **Směrování:** `react-router-dom` v6.30.3 s přizpůsobeným basename pro subpath deployment.
- **Kvalita a testy:** Vitest 5.0.0, `@testing-library/react` 16.3.3, `@testing-library/user-event` 14.6.7, JSDOM.

### 2.2 Směrování a URL architektura
Směrování je definováno v [App.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/App.tsx) s basename normalizací v [src/lib/router.ts](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/lib/router.ts):

| Cesta | Komponenta | Účel | Oprávnění |
|---|---|---|---|
| `/` | `Catalog.tsx` | Veřejný vyhledávací katalog | Veřejné |
| `/items/:id`, `/detail/:id` | `Detail.tsx` | Karta sbírkového předmětu | Veřejné / Kurátor |
| `/feedback` | `Feedback.tsx` | Odeslání připomínky veřejností | Veřejné |
| `/login` | `Login.tsx` | Přihlašovací formulář pro kurátory | Veřejné |
| `/admin/items` | `AdminItems.tsx` | Správa předmětů (kurátorský seznam) | ROLE_CURATOR / ROLE_ADMIN |
| `/admin/items/new` | `AdminItemForm.tsx` | Založení nového předmětu | ROLE_CURATOR / ROLE_ADMIN |
| `/admin/items/edit/:id` | `AdminItemForm.tsx` | Editace předmětu | ROLE_CURATOR / ROLE_ADMIN |
| `/admin/items/view/:id` | `AdminItemForm.tsx` | Prohlížení předmětu (read-only) | ROLE_CURATOR / ROLE_ADMIN |
| `/admin/import` | `DataImport.tsx` | Webový průvodce importem z Accessu | ROLE_ADMIN |

### 2.3 Kompatibilita s nasazením pod subpath (`/uat/`)
Větve `fix/uat-subpath` zavedla čistou normalizaci cest:
- `VITE_APP_BASE` je zpracována funkcí `normalizeAppBase()` v [src/lib/base.ts](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/lib/base.ts) a předána Vite konfiguraci.
- `getRouterBasename()` v [src/lib/router.ts](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/lib/router.ts) zajišťuje, že React Router v6 obdrží basename bez koncového lomítka (např. `/uat`), ale pro kořen zachová `/`.
- `resolveApiUrl()` a `buildApiUrl()` v [src/lib/api.ts](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/lib/api.ts) zabraňují zdvojení prefixů (např. `/uat/uat/api/v1/...`).

### 2.4 Stavové řízení a komunikace s API
- **Autentizace:** [AuthContext.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/components/AuthContext.tsx) uchovává JWT token v `localStorage`, dekóduje role (`ADMIN`, `CURATOR`) a poskytuje odpočet doby sezení (`SessionTimer`).
- **Persistence kontextu vyhledávání:** `AdminItems.tsx` ukládá aktuální vyhledávací parametry (filtry, stránku, řazení) do URL `searchParams` a do `sessionStorage.getItem('adminItemsSearch')`. Při přechodu do detailu/editace předává `location.state.fromSearch`, což umožňuje návrat na přesnou stránku i po reloadu.
- **API komunikace:** Centrální modul [src/lib/api.ts](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/lib/api.ts) zajišťuje všechny HTTP požadavky přes nativní `fetch`. Požadavky do admin rozhraní automaticky přikládají `Authorization: Bearer <token>`.

---

## 3. Komponentová dekompozice a audit klíčových prvků

### 3.1 Seznam sbírkových předmětů ([AdminItems.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/AdminItems.tsx))
- **Stav:** Plně funkční server-side tabulkový seznam s vyhledáváním a rychlými filtry.
- **Nedostatky:**
  1. Paginace je umístěna **pouze v patičce** tabulky (řádky 487–496). Na velkých obrazovkách musí kurátor po zobrazení 50 položek scrollovat dolů.
  2. Paginace neumožňuje **přímý skok na stránku zadáním čísla** (zobrazuje pouze text `page + 1 / data.totalPages`).
  3. Rychlé filtry obsahují `subCollection`, ale **zcela postrádají Fond**.
  4. Chybí filtrace podle historických polí **Zapsal** (`legacyCreatedBy`) a **Určil** (`urcil`).
  5. V titulku i textech je použit nevhodný termín **„Správa exponátů“** namísto „Správa sbírkových předmětů“ / „Předměty“.

### 3.2 Detail a editace předmětu ([AdminItemForm.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/AdminItemForm.tsx) a [Detail.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/Detail.tsx))
- **Stav:** Monolitický formulář čítající 2455 řádků kódu spravující kompletní životní cyklus předmětu.
- **Nedostatky:**
  1. **Absence permanentní hlavičky:** Uživatel nevidí základní identifikační údaje (Fond, Předmět, Popis, Titul, Autor, Datace) při přechodu na záložky 2–5 ani při scrollování.
  2. **Sloučení Fondu a Podsbírky:** Řádky 1099–1120 obsahují jediný prvek `<GovFormLabel htmlFor="subCollection">Fond / Podsbírka</GovFormLabel>` naplněný hodnotami z `dicts.funds`.
  3. **Invertovaná povinnost čísel:** Přírůstkové číslo je označeno jako `required` (řádek 1039), zatímco Inventární číslo je nepovinné.
  4. **Duplicitní pole:** `markant` a `signature` se nacházejí v hlavním formuláři a zároveň v podsekci muzejní evidence `MuseumSection.tsx`.
  5. **Tlačítko „Zpět na seznam“:** Nachází se až na řádku 2410 (patička formuláře). V záhlaví chybí.

### 3.3 Záložková struktura formuláře
Aktuální rozdělení do 5 záložek:
- `identity`: Základní údaje & Identifikace (přír. č., inv. č., název, fond/podsbírka, typ, stav zpracování, správce, oddělení).
- `description`: Popis & Rozměry (autor, datace, materiál, technika, rozměry, textový popis).
- `provenance`: Původ & Nabytí (způsob nabytí, datum, dárce/původce, místo vzniku, lokalita nálezu, pojištění).
- `storage`: Umístění & Uložení (budova, místnost, trvalé uložení, GPS souřadnice).
- `museum`: Odborná evidence & DEMUS (vnořené podzáložky: dokumentace, klasifikace, určení, deakcese, manipulace, akce, ISO, DEMUS trezor, přílohy, audit).

Tato organizace částečně odpovídá logickým celkům, ale nerespektuje původní obrazovku DEMUS, kde byla stěžejní pole (Fond, Předmět, Titul, Autor, Datace, Popis, Zapsal) viditelná pohromadě.

### 3.4 Inventární číslo – reprezentace a stav
- V současném kódu je inventární číslo uloženo jako jednoduchý řetězec:
  ```tsx
  <GovFormInput
      id="inventoryNumber"
      value={form.inventoryNumber || ''}
      onChange={(e: any) => setForm({ ...form, inventoryNumber: e.target.value })}
      onBlur={(e: any) => handleNumberBlur('inventory', e.target.value)}
  />
  ```
- Chybí 3 oddělené UI komponenty (prefix / hlavní číslo / postfix).
- Backend persistence eviduje pouze jeden sloupec `inventory_number` v tabulce `core.item`.

### 3.5 Tiskové komponenty ([MuseumCardPrint.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/components/MuseumCardPrint.tsx), [ItemListPrint.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/components/ItemListPrint.tsx))
- [MuseumCardPrint.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/components/MuseumCardPrint.tsx) je pevně nastaven na formát A4 na výšku (`style={{ minHeight: '297mm' }}`).
- [ItemListPrint.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/components/ItemListPrint.tsx) v režimu `cards` renderuje katalogizační karty rovněž jako A4 na výšku (`style={{ minHeight: '270mm' }}`).
- **Požadavek CITEM na evidenční kartu A5 landscape není v kódu vůbec implementován.**

### 3.6 Export do Excelu ([exportItemsToExcel](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/lib/api.ts#L401-L435))
- Funkce stahuje binární proud z `/api/v1/items/export/excel`.
- V [AdminItems.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/AdminItems.tsx#L195-L211) je spuštěna asynchronně, ale komponenta **nemá žádný lokální stav `isExporting`**.
- Uživatel po kliknutí na tlačítko nevidí žádný spinner, progress bar ani blokaci tlačítka.

---

## 4. Analýza vizuálního stylu a DEMUS layout parity

### 4.1 Problémy aktuálního designu
1. **Příliš mnoho „hluchého“ místa (white space):** Form-groups mají vertikální mezery 16–24 px, tabulky mají paddingy buněk `py-4 px-6`. Na monitoru s rozlišením Full HD (1920×1080) se bez scrollování vejde pouze zlomek formuláře.
2. **Dekorativní prvky na úkor dat:** Drobečková navigace, velké kulaté štítky, masivní sidebary ubírají efektivní pracovní plochu.
3. **Pomalé přepínání kontextu:** Kurátor musí mezi kartami opakovaně klikat, aby zjistil základní informace, které v DEMUS viděl okamžitě v jednom okně.

### 4.2 Cílové zásady DEMUS parity
- Kompaktní mřížka s maximální vertikální a horizontální efektivitou.
- Zmenšení výšky řádků tabulky na kompaktní úroveň (padding 4–6 px).
- Pevná, zrakově ukotvená identifikační lišta (Fond, Předmět, Popis, Titul, Autor, Datace) v horní části obrazovky pod hlavní navigací.
- Ponechání klíčových polí pohromadě na úvodní obrazovce.
- Umožnění ovládání klávesnicí (Tab order, Enter submit, Esc close modal).

---

## 5. Závěr technického auditu

Frontendová aplikace `curatas-fe` má zdravý technologický základ, stabilní build a kvalitní sadu unit/integračních testů (67 testů prochází). Architektura routování a podpora subpath nasazení (`/uat/`) je plně funkční a nesmí být narušena.

Stávající nedostatky vůči závěrům jednání CITEM z 24. 9. 2026 jsou přesně ohraničené a jejich náprava je technicky realizovatelná. V následujících dokumentech je zpracována závazná matice požadavků, analýza backendových závislostí, katalog rizik datové integrity a podrobný implementační plán.
