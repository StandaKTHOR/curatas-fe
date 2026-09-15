# MZM – migrace na Gov Design System CE

## A. UI inventory (před migrací)

| Oblast | Výskyt a původní provedení |
| --- | --- |
| Layout | App: pevný 250px sidebar a odsazení, Bootstrap row/col, Tailwind, vlastní CSS |
| Navigation / header | App: odkazy React Router, emoji, vlastní breadcrumb, timer; nepřístupné malé texty |
| Buttons / links | Všechny obrazovky: native button, genric-btn, shadcn/Radix Button, Router Link |
| Inputs / search | Catalog: hledání a 12 filtrů; AdminItems: hledání a 3 viditelné filtry; Login; AdminItemForm; DataImport |
| Selects | AdminItemForm: typ, stav zpracování, autor, materiál, technika, nabytí, fyzický stav, správce |
| Checkbox / radio | AdminItemForm: přepínač publikování; radio se aktuálně nepoužívá |
| Textarea | Feedback: zpráva; AdminItemForm: popis, rozšířený popis, audit |
| Datepicker | AdminItemForm: datum nabytí (native date); roky datování jsou čísla, ne datum |
| Autocomplete | AdminItemForm: vlastní země původu s klikacími divy a volným vstupem |
| Tables | AdminItems: tabulka 50 záznamů se čtyřmi akcemi; DataImport: stránkované validační chyby |
| Pagination | AdminItems a DataImport: vlastní předchozí/další; Catalog zatím jen první stránka |
| Tabs | AdminItemForm: šest vlastních tlačítek bez tab semantics |
| Dialogs | AdminItems: kopírování (vlastní overlay), mazání (window.confirm) |
| Notifications | Login, Feedback, DataImport; AdminItems/AdminItemForm používají alert |
| Validation | Duplicity čísel z API, required pole, min. délka připomínky, výsledky importu |
| Loaders | Textové stavy, vlastní progress při importu |
| Forms | Přihlášení, připomínka, filtry, editor, kopírování, upload importu a fotografie |
| Ostatní | Catalog karty, Detail galerie/dl/historie, SafeImage, A5 tisk QR štítku |

## B. Gov component mapping

| Oblast | Náhrada |
| --- | --- |
| Layout / header / navigation | Oficiální Gov layout/header/navigation organismy a tokeny, sémantické landmarks |
| Button / Link | GovButton / GovLink (Router zachován) |
| Input / textarea | GovFormControl + GovFormLabel + GovFormInput |
| Search | GovFormSearch |
| Select | GovFormSelect |
| Checkbox / radio | GovFormCheckbox / GovFormRadio (radio nepřidává nové business pole) |
| Datepicker | GovFormDatepicker |
| Autocomplete | GovFormAutocomplete, zachování volného textu země |
| Table | Oficiální Gov Table HTML/CSS pattern, caption, scope, vodorovný scroll |
| Pagination | GovPagination |
| Tabs | GovTabs / GovTabsItem |
| Dialog | GovDialog |
| Notifications / validation | GovMessage a GovFormMessage, asociace na pole |
| Tooltip | GovTooltip |
| Loader | GovLoading |
| Karty / soubory / breadcrumbs | GovCard / GovFormFile / GovBreadcrumbs |

## Zdroje a závislosti

Ověřeno 9. 9. 2026: npm latest všech pěti balíčků je **4.7.0**. React wrapper podporuje React >=18, stávající React 18 zůstává.

- https://designsystem.gov.cz/zaciname/for-developers
- https://designsystem.gov.cz/zaciname/developers/react
- https://designsystem.gov.cz/organismy/table
- https://designsystem.gov.cz/organismy/header-navigation

Pořadí stylů: tokens → styles → layout → components → animations; navíc content a styly organismů podle dostupných exportů balíčku. Fonty a ikony se servírují lokálně z oficiálních balíčků.

## Zachované funkce

Routes a `src/lib/api.ts`, import API kontrakt, autorizace a časování session, edit/create payload, API kontrola unikátnosti, navržená čísla, upload fotografie, kopírování, export XLSX, tisk QR, filtry, stránkování a import polling. Přetrvává zdokumentované omezení backend import kontraktu v `web-import.md`.

## D–H. Výsledek migrace

Bude doplněno po implementaci a ověření v prohlížeči.
