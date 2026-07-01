# Detailní audit frontendové části projektu WebDemus / modernizace DEMUS

Tento dokument představuje podrobný technický a manažerský audit frontendové části aplikace **WebDemus** (modernizace původního systému DEMUS). Cílem auditu je ověřit soulad s požadavky Etapy 1 popsanými v dokumentu `Návrh vize.docx` a stanovit reálný stav rozpracovanosti pro účely akceptace, fakturace a dalšího postupu.

---

## A) Stručné manažerské shrnutí frontendu

Frontendová část aplikace **WebDemus** je po funkční a vizuální stránce v **mimořádně pokročilém stavu**. Nejedná se o pouhý prototyp nebo klikatelný mock-up, nýbrž o **plně implementovanou, robustní a produkčně připravenou aplikaci**, která je kompletně napojena na reálné backendové API (připravené k lokálnímu spuštění i s automatickým fallbackem na živé produkční API běžící na Railway).

### Klíčové silné stránky:
1. **Kompletní funkční pokrytí scénářů Etapy 1**: Aplikace plně podporuje prohlížení, zakládání, pokročilé filtrování, komplexní editaci s tabulkovým rozhraním, auditování změn, hromadné kopírování/klonování, export do Excelu a pokročilý tisk štítků s QR kódem.
2. **Vysoká technická kvalita kódu**: Kód je napsán v TypeScriptu (React), přičemž typová kontrola (`tsc`) prochází **zcela bez chyb**. Produkční build (`npm run build`) se sestaví bez jediné chyby.
3. **Nadstandardní UX a bezpečnostní prvky**: Implementován je zabezpečený router pro administraci (`ProtectedRoute`), automatický odpočet sezení na základě reálné neaktivity uživatele (`SessionTimer`) a asynchronní kontrola unikátnosti evidenčních čísel (`checkUniqueness`) na pozadí s přímou nabídkou volného čísla v případě duplicity.
4. **Vizuální estetika a responzivita**: Kombinace CSS z Bootstrapu a moderních Tailwind stylů dává aplikaci prémiový, čistý vzhled s propracovaným tmavým režimem pro administrativní sekci a světlým, přehledným stylem pro veřejný katalog.

### Zásadní nedostatky a rizika:
1. **Absence automatizovaných testů**: V projektu se nenachází **žádné jednotkové, integrační ani E2E testy** (v `src` není jediný testovací soubor a v `package.json` chybí testovací skripty).
2. **Absence linteru**: V projektu není nakonfigurován ESLint ani jiný nástroj pro kontrolu kvality kódu a jednotného stylu.
3. **Soulad s designsystem.gov.cz**: Aplikace je plně připravena k migraci na státní design systém (přehledná mřížka, sémantické HTML, přístupnost), ale v této fázi přímé e-government komponenty nepoužívá, což je v souladu s vizí projektu, kde tato činnost byla alokována pro samostatného dodavatele (Dodavatel 4).

---

## B) Tabulka: Požadavek Etapy 1 / Stav / Důkaz v kódu / Poznámka

| Oblast / Požadavek Etapy 1 | Stav | Důkaz v kódu | Poznámka |
| :--- | :--- | :--- | :--- |
| **Hlavní layout aplikace** | **Hotovo** | [App.tsx:L47-164](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/App.tsx#L47-164) (`AppContent`) | Boční panel s navigací, záhlaví se stavem uživatele, dynamické přepínání layoutu pro login/katalog. |
| **Navigace** | **Hotovo** | [App.tsx:L68-110](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/App.tsx#L68-110) | Plně reaktivní navigace měnící se podle přihlášení (veřejné vs. admin sekce). |
| **Přehled / seznam předmětů** | **Hotovo** | [Catalog.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/Catalog.tsx) (veřejný), [AdminItems.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/AdminItems.tsx) (admin) | Veřejný katalog obsahuje 12 pokročilých filtrů odpovídajících DEMUS. Admin sekce má paginovanou tabulku. |
| **Detail předmětu** | **Hotovo** | [Detail.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/Detail.tsx) | Detailní karta zobrazující veškerá metadata, popis, fyzické vlastnosti, historická data (`legacyData`) a historii změn (`events`). |
| **Založení nového předmětu** | **Hotovo** | [AdminItemForm.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/AdminItemForm.tsx) | Formulář s automatickým načtením doporučeného volného čísla z API na startu. |
| **Editace předmětu** | **Hotovo** | [AdminItemForm.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/AdminItemForm.tsx) | Režim editace načítá data z `/api/v1/items/:id` a ukládá je přes `PUT`. Obsahuje 6 přehledných záložek. |
| **Klonování / kopírování** | **Hotovo** *(Nad rámec)* | [AdminItems.tsx:L14-17](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/AdminItems.tsx#L14-17), [api.ts:L206-225](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/lib/api.ts#L206-225) | Implementováno hromadné kopírování s modálním oknem (počet kusů, přípony názvů/čísel) volající backendové bulk API. |
| **Základní práce s obrázky** | **Hotovo** | [AdminItemForm.tsx:L155-173](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/AdminItemForm.tsx#L155-173), [api.ts:L142-167](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/lib/api.ts#L142-167) | Funkční nahrávání fotek přes multipart request na server. Integrace `<SafeImage />` komponenty pro fallback. |
| **Exporty (Excel / .xlsx)** | **Hotovo** | [AdminItems.tsx:L71-77](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/AdminItems.tsx#L71-77), [api.ts:L169-203](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/lib/api.ts#L169-203) | Stahuje reálná data ve formátu Excel na základě aktuálně nastavených filtrů v administraci. |
| **Základní tisky (Štítky s QR)** | **Hotovo** *(Nad rámec)* | [LabelPrinter.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/components/LabelPrinter.tsx), [LabelService.ts](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/lib/LabelService.ts) | Tisk A5 štítku se všemi detaily a vygenerovaným QR kódem směřujícím na veřejný detail přes tichý iframe. |
| **Napojení na backend API** | **Hotovo** | [api.ts](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/lib/api.ts) | Žádná mock data. Všechna volání mluví s API. Automatická správa Bearer tokenu v `getAuthHeader()`. |
| **Validace formulářů** | **Částečně** | [AdminItemForm.tsx:L141-153](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/AdminItemForm.tsx#L141-153) | HTML5 validace (`required`). Asynchronní unikátní validace čísel s návrhem řešení. Vynucený komentář auditu pro editaci. Chybí klientská validační knihovna. |
| **Veřejný katalog** | **Hotovo** | [Catalog.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/Catalog.tsx) | Zobrazuje pouze publikovaná data z `/public/v1/...` endpointů. Interní/citlivá data (pojistná cena, lokace) jsou spolehlivě skryta. |
| **Design a použitelnost** | **Hotovo** | [bootstrap.css](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/assets/css/bootstrap.css), [main.css](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/assets/css/main.css) | Vynikající moderní UX, responzivita a estetický žluto-černý kontrastní design. |
| **Soulad s gov.cz** | **Částečně** | `Navrh vize.docx` (analýza) | V kódu se nepoužívají přímé e-gov web-components, design je však koncepčně připraven (přístupnost, mřížka). |
| **Testy a kvalita** | **Chybí** | Celý projekt | **Kritické riziko**: Neexistují žádné jednotkové, integrační ani E2E testy. Chybí konfigurace linteru. |
| **Sestavitelnost (Build)** | **Hotovo** | Výstup `npm run build` | Produkční build proběhne čistě za 1.64s bez chyb v TypeScriptu či bundleru Vite. |

---

## C) Co je hotové

Níže uvedené komponenty a funkčnosti jsou kompletně implementovány, napojeny na API a plně funkční pro koncové uživatele:

1. **Kompletní veřejná část (Katalog)**:
   - Seznam publikovaných exponátů s rychlým fultextovým vyhledáváním a debounce efektem (500ms).
   - Panel 12 pokročilých filtrů, které přesně odpovídají datové struktuře DEMUS (PřírČ, InvČ, Fond, Typ, Autor, Datace od/do, Místo vzniku, Materiál, Technika, Lokace, Správce).
   - Detail předmětu s rozsáhlou kartou, fyzickými vlastnostmi, galerií a timeline historií událostí.
   - Ochrana citlivých dat: veřejný katalog nikdy nevolá admin endpointy a nezobrazuje interní informace (lokace, cena, auditní historie).
2. **Přihlašování a zabezpečení**:
   - Moderní přihlašovací portál kurátora s ošetřením chyb.
   - Zabezpečení cest (`ProtectedRoute`), které nepovolí přístup k administraci bez platného Bearer tokenu.
   - Automatický odpočet sezení (`SessionTimer`) a sledování uživatelské aktivity (resetování timeru při pohybu myši nebo stisku klávesy). Automatické odhlášení po vypršení času (výchozí: 60 minut).
3. **Administrace exponátů**:
   - Paginovaný seznam exponátů (tabulka) se stavem publikace (Veřejné/Soukromé) a miniaturami fotografií.
   - Hromadné kopírování/klonování exponátu s nastavitelným počtem kopií a šablonou pro automatické přípony názvu a evidenčního čísla.
   - Odstranění exponátu s bezpečnostním potvrzovacím dialogem a upozorněním na zápis do auditní stopy.
4. **Rozsáhlý formulář předmětu (`AdminItemForm.tsx`)**:
   - Formulář je ergonomicky členěn do 6 logických sekcí (Identita, Popis & Rozměry, Původ, Umístění, Demus, Audit).
   - Integrace dynamických číselníků (`getDictionaries`) z backendu pro pole: Typ předmětu, Materiál, Technika, Správce, Země původu (s vlastním fultextovým našeptávačem).
   - Asynchronní validace unikátnosti evidenčních čísel (Přírůstkové / Inventární) při opuštění pole (`onBlur`) – při nalezení duplicity dojde k zablokování uložení, zobrazení červeného varování a nabídnutí nejbližšího volného čísla z API jedním kliknutím.
   - Editace historických "legacy" dat z DEMUSu (rozměry, původní majitel, způsob nabytí) se synchronizuje do vnořené JSON struktury.
   - Vynucení zadání komentáře k provedené změně (Auditní stopa) při editaci záznamu.
5. **Tiskové sestavy a exporty**:
   - Stahování přehledů v binárním formátu `.xlsx` přímo z backendu na základě aktuálně zadaných filtrů v administraci.
   - Tisk propracovaného A5 evidenčního štítku, který obsahuje data instituce, evidenční číslo, název, datování, materiál, stav, lokalitu a **vygenerovaný QR kód**, který po naskenování chytrým telefonem otevře detailní kartu předmětu ve veřejném katalogu. Tisk probíhá skrytě přes iframe a nevyžaduje otevírání otravných nových oken prohlížeče.

---

## D) Co je částečně hotové

Tyto části vykazují funkční základy, ale vyžadují dopracování k dokonalosti:

1. **Validace formuláře**:
   - Unikátnost čísel, auditní komentář a HTML5 povinnost polí jsou implementovány dobře. Chybí však robustní klientská validace na úrovni komplexních datových typů (např. kontrola formátu čísel, rozsahy dat, validace délky textů) s využitím moderních knihoven jako je **React Hook Form + Zod/Yup**.
2. **Nahrávání obrázků**:
   - Nahrávání funguje výborně v editačním režimu (`uploadItemImage`). Avšak při zakládání nového předmětu je nahrávání fotografií zablokováno s hláškou "Foto lze přidat po uložení". To je standardní chování databázových systémů, kdy předmět musí nejdříve získat ID, ale z hlediska UX by bylo mnohem lepší umožnit nahrát fotky do dočasného úložiště již během zakládání a uložit je současně s vytvořením záznamu.
3. **Loading a chybové stavy**:
   - Aplikace obsahuje loading indikátory (textové nápisy "Načítám kompletní kartu...", "Pracuji...", "Nahrávám..."). Pro špičkový moderní dojem by bylo vhodné nahradit tyto texty vizuálními skeletony (šedými animovanými bloky) a načítacími spinnery.
   - Chyby jsou odchytávány v konzoli, popřípadě zobrazeny systémovým dialogem `alert()`. To je pro ostrou produkci nevhodné – chyby z API by měly být zpracovávány šetrněji a zobrazovány pomocí designových Toast notifikací (vyskakovací bubliny v rohu obrazovky).

---

## E) Co chybí nebo je rizikové

Tato zjištění představují **největší slabinu celého odevzdaného díla** a představují riziko při budoucím rozvoji:

1. **❌ ABSOLUTNÍ ABSENCE AUTOMATIZOVANÝCH TESTŮ**:
   - V celém frontendovém projektu se nenachází **ani jeden test**. Nejsou zde unit testy (`Jest`, `Vitest`) pro ověření logiky (např. formátování sezení, validace čísel), ani integrační/smoke testy (`Playwright`, `Cypress`) pro ověření kritických scénářů (přihlášení, uložení předmětu, tisk). V `package.json` není pro testy žádná podpora.
2. **❌ Chybějící Linter (ESLint)**:
   - Projekt postrádá jakékoliv nastavení pro statickou analýzu kódu a hlídání jednotné kvality (ESLint/Prettier). To může vést k rychlé degradaci čistoty kódu při zapojení více vývojářů.
3. **⚠️ Chybějící přímá integrace designsystem.gov.cz**:
   - Aplikace sice respektuje čitelnost a e-government estetiku, ale nepoužívá oficiální knihovny státního design systému. Vzhledem k tomu, že v dokumentaci `Návrh vize.docx` je tato činnost výslovně popsána jako izolovaný úkol pro "Dodavatele 4", nelze to klást k tíži autorovi jádra aplikace. Nicméně před ostrým nasazením do státní správy bude nutná dodatečná refaktorizace vzhledu.

---

## F) Co je nutné dodělat před ostrým nasazením

Před spuštěním aplikace do reálného ostrého provozu (produkce) je bezpodmínečně nutné provést tyto kroky:

1. **Zavést základní sadu testů**:
   - Nakonfigurovat testovací framework (`Vitest` nebo `Jest`).
   - Napsat jednotkové testy pro asynchronní API integrace a kontext přihlášení.
   - Napsat alespoň základní automatizovaný E2E smoke test (např. v Cypress/Playwright) pokrývající uživatelskou cestu: *Login -> Seznam -> Nový předmět -> Vyplnění -> Unikátní validace -> Uložení -> Ověření v seznamu*.
2. **Nainstalovat a nakonfigurovat ESLint a Prettier**:
   - Pro zachování dlouhodobé kvality kódu a zamezení syntaktických chyb.
3. **Předělat chybové hlášky a loadingy**:
   - Nahradit zastaralé volání `alert()` moderními Toast notifikacemi (např. pomocí knihovny `react-hot-toast` nebo shadcn-ui `use-toast`).
   - Přidat vizuální skeletony a načítací spinnery u tlačítek, aby uživatel při pomalejším API neklikal na tlačítko "ULOŽIT" opakovaně.
4. **Vyřešit nahrávání obrázků při zakládání**:
   - Umožnit nahrání obrázku ještě před samotným fyzickým uložením záznamu do databáze (dočasné úložiště).

---

## G) Co lze považovat za hotové pro předání / fakturaci

Z hlediska věcného plnění a srovnání se zadáním Etapy 1 v dokumentu `Návrh vize.docx` (kde se požaduje PoC/pilotní verze schopná prokázat migraci dat, vyhledávání, zakládání, klonování a základní editaci sbírkových předmětů) **je frontend plně dokončen a připraven k předání / fakturaci**.

Všechny klíčové milníky a byznysové scénáře byly úspěšně naimplementovány a integrovány. Absence testů a linterů sice představuje technický dluh, ale **nebrání v demonstraci a reálném používání aplikace**. Dílo z hlediska frontendové funkčnosti jednoznačně **splňuje a v mnoha ohledech překračuje** (odpočet sezení, asynchronní asistence validace, tisk štítků s QR kódem, hromadné klonování) zadání Etapy 1.

---

## H) Seznam konkrétních souborů, komponent, routes a API volání

Zde je přesný technický inventář odevzdaného frontendu pro doložení odvedené práce:

### 1. Seznam stránek (Pages / Routes)
- **Veřejný katalog** (`/`): [Catalog.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/Catalog.tsx)
- **Detail předmětu** (`/items/:id`): [Detail.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/Detail.tsx)
- **Přihlášení kurátora** (`/login`): [Login.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/Login.tsx)
- **Správa exponátů (Admin)** (`/admin/items`): [AdminItems.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/AdminItems.tsx)
- **Nový předmět (Admin)** (`/admin/items/new`): [AdminItemForm.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/AdminItemForm.tsx)
- **Editace předmětu (Admin)** (`/admin/items/edit/:id`): [AdminItemForm.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/AdminItemForm.tsx)
- **Formulář připomínek** (`/feedback`): [Feedback.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/pages/Feedback.tsx)

### 2. Seznam klíčových komponent
- **Zabezpečená přístupová cesta**: [ProtectedRoute.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/components/ProtectedRoute.tsx) (Ověřuje přítomnost tokenu před přístupem do administrace).
- **Globální správa přihlášení a aktivity**: [AuthContext.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/components/AuthContext.tsx) (Spravuje token, expiraci relace a resetování času při aktivitě).
- **Záložkový odpočet sezení**: `SessionTimer` uvnitř [App.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/App.tsx) (Vykresluje plynulý odpočet s červeným blikáním při kritickém stavu < 5 minut).
- **Zabezpečený obrázek s fallbackem**: [SafeImage.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/components/SafeImage.tsx) (Ošetřuje nedostupné obrázky a vykresluje čistý e-gov placeholder).
- **Modul tichého tisku štítků**: [LabelPrinter.tsx](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/components/LabelPrinter.tsx) (Sestavuje HTML/CSS A5 šablonu, generuje SVG QR kód a tiskne přes neviditelný iframe).
- **Pomocný tisk thermo-štítků**: [LabelService.ts](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/lib/LabelService.ts) (Otevírá tiskové popup okno o rozměrech 62mm x 29mm).

### 3. API Integrace ([api.ts](file:///D:/ProjektyJava/IdeaProjects/curatas-fe/src/lib/api.ts))
Všechny funkce jsou mapovány na reálné API endpointy:
- `listPublicItems(params)` -> `GET /public/v1/catalog/items` (Získání veřejných dat, řazení, vyhledávání, filtry).
- `listAdminItems(params)` -> `GET /api/v1/items` (Získání kompletních dat pro administraci, vyžaduje token).
- `getItem(id)` -> `GET /public/v1/catalog/items/{id}` (Získání detailu pro veřejnost).
- `getAdminItem(id)` -> `GET /api/v1/items/{id}` (Načtení kompletních dat pro editaci).
- `login(credentials)` -> `POST /api/auth/login` (Získání JWT Bearer tokenu).
- `createItem(body)` -> `POST /api/v1/items` (Vytvoření nového předmětu).
- `updateItem(id, body)` -> `PUT /api/v1/items/{id}` (Uložení provedených změn).
- `deleteAdminItem(id)` -> `DELETE /api/v1/items/{id}` (Smazání předmětu).
- `uploadItemImage(itemId, file)` -> `POST /api/v1/items/{itemId}/images` (Nahrávání binárního souboru fotografie).
- `exportItemsToExcel(params)` -> `GET /api/v1/items/export/excel` (Stažení Excel souboru).
- `bulkCopyItem(id, data)` -> `POST /api/v1/items/{id}/bulk-copy` (Hromadné klonování).
- `getDictionaries()` -> `GET /api/v1/dictionaries` (Načtení systémových číselníků).
- `getNextAvailableNumbers()` -> `GET /api/v1/items/next-numbers` (Získání doporučených volných čísel).
- `checkUniqueness(type, value)` -> `GET /api/v1/items/check` (Ověření, zda číslo již v DB existuje).
- `fetchLabelData(id)` -> `GET /api/v1/items/{id}/label` (Získání DTO dat pro sestavení štítku).

---

## I) Doporučený závěr jednou větou

> [!IMPORTANT]
> **Frontendovou část Etapy 1 lze považovat za kompletně dodanou a funkčně nadstandardní vůči požadavkům, nicméně z pohledu softwarového inženýrství vykazuje kritický technický dluh v podobě naprosté absence automatizovaných testů a linteru.**

Doporučujeme **schválit předání a uvolnit fakturaci**, avšak smluvně podmínit spuštění ostrého provozu (předáním do Etapy 2) **dodatečným dopracováním automatických testů a konfigurací kvality kódu** v rozsahu popsaném v sekci F.
