# CURATAS – Audit backendových kontraktů a API závislostí

**Datum auditu:** 3. října 2026  
**Analyzovaný backend:** `D:\ProjektyJava\IdeaProjects\curatas-be`  
**Větev BE baseline:** `fix/fund-subcollection-v17`  
**Commit BE baseline:** `c140d1b402c9482046e1068a1791e090b67be291`  

---

## 1. Souhrnné vyhodnocení realizovatelnosti požadavků CITEM

Na základě hloubkového auditu Java kódu Spring Boot aplikace a Flyway migrací v `curatas-be` bylo stanoveno rozdělení požadavků CITEM do tří kategorií:

1. **Plně realizovatelné výhradně ve frontendu (BE plně připraven):**
   - Nezávislá pole **Fond** a **Podsbírka** (BE má po migraci V17 plnou podporu).
   - **Permanentní identifikační hlavička** (všechna data jsou v `ItemDetailDto`).
   - **Oboustranná paginace a přímý skok na číslo strany** (BE endpointy podporují standardní Spring Data `page` a `size`).
   - **Indikace stavu exportu do Excelu** (asynchronní řízení stavu ve FE).
   - **Tisk evidenční karty A5 landscape** (využívá existující tisková a detailová data).
   - **Zhutnění layoutu a DEMUS parita rozhraní**.
   - **Odstranění duplicitního zadávání Markantu a Signatury**.
   - **Úprava terminologie** (odstranění „exponát“).

2. **Realizovatelné ve frontendu s dočasným přemostěním (FE workaround před BE změnou):**
   - **Tříprvkové inventární číslo:** FE provede syntézu prefixu, čísla a postfixu do stávajícího textového sloupce `inventoryNumber`.
   - **Pravidlo povinnosti Typ / Název:** BE při zakládání striktně vyžaduje `@NotBlank title`. Pokud kurátor zadá pouze Typ, FE dočasně zkopíruje hodnotu Typu do Názvu.

3. **Kriticky závislé na úpravách backendu (blokátory pro plnou funkčnost):**
   - **Server-side pokročilé filtrování podle polí `Zapsal`, `Určil` a `Fond`:** Backend v `ItemSearchRequest` a `ItemSpecification.java` tato pole nezná a ignoruje je.
   - **Číselník podsbírek:** `GET /api/v1/dictionaries` vrací `funds`, ale nevrací seznam existujících podsbírek, přestože metoda `findDistinctSubCollections()` v repository již existuje.
   - **Uvolnění validace `@NotBlank title` na backendu** pro čistou podporu scénáře zadání pouze Typu předmětu.

---

## 2. Detailní audit existujících BE kontraktů

### 2.1 Nezávislost Fondu a Podsbírky po migraci V17
V databázi a entitním modelu [ItemEntity.java](file:///D:/ProjektyJava/IdeaProjects/curatas-be/src/main/java/cz/curatas/entity/ItemEntity.java) jsou obě pole striktně oddělena:
```java
// core.item
@Column(name = "sub_collection")
private String subCollection;              // Podsbírka (volný text / kód podsbírky)

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "fund_dictionary_id")
private DictionaryEntity fundDictionary;   // Vazba na číselník fondů (dict_type = 'FUND')

@Column(name = "fund_legacy_code")
private String fundLegacyCode;             // Historický kód fondu z DEMUS (Fond_S)
```

V DTO modelech [ItemDtos.java](file:///D:/ProjektyJava/IdeaProjects/curatas-be/src/main/java/cz/curatas/dto/ItemDtos.java):
- **CreateItemRequest:** Přijímá `String subCollection`, `Long fundDictionaryId`, `String fundLegacyCode`.
- **UpdateItemRequest:** Přijímá `String subCollection`, `Long fundDictionaryId`, `String fundLegacyCode`, `Boolean clearFund`.
- **ItemDetailDto:** Vrací `String subCollection`, `Long fundDictionaryId`, `String fundLegacyCode`.

**Závěr pro FE:** Backend je plně připraven. Frontend v `AdminItemForm.tsx` a `AdminItems.tsx` pouze nesmí obě pole směšovat a musí posílat `fundDictionaryId` i `subCollection` jako dva nezávislé parametry.

---

### 2.2 Inventární číslo – perzistence a kontrakty
V [ItemEntity.java](file:///D:/ProjektyJava/IdeaProjects/curatas-be/src/main/java/cz/curatas/entity/ItemEntity.java):
```java
@Column(name = "inventory_number")
private String inventoryNumber;

@Column(name = "inv_code_text")
private String invCodeText;

@Column(name = "inv_code_sort")
private String invCodeSort;
```

V [InternalItemController.java](file:///D:/ProjektyJava/IdeaProjects/curatas-be/src/main/java/cz/curatas/controller/InternalItemController.java#L143-L157):
- Backend provádí kontrolu duplicity `repo.existsByInventoryNumber(inventoryNumber)` výhradně nad celým řetězcem.
- V DTO neexistují samostatná pole `prefix`, `mainNumber`, `postfix`.

**Závěr pro FE:**
- Front-endová implementace tří vstupních komponent musí transparentně skládat výslednou hodnotu do pole `inventoryNumber` při odesílání požadavku na BE.
- Při načtení detailu musí FE inteligentně rozložit stávající `inventoryNumber` na komponenty, aniž by došlo ke zkreslení nestandardních řetězců.
- Pokud bude muzeum v budoucnu vyžadovat samostatné sloupce v databázi, bude nutná nová DB migrace a úprava DTO.

---

### 2.3 Povinná pole a validace – backendová blokace
V [ItemDtos.java](file:///D:/ProjektyJava/IdeaProjects/curatas-be/src/main/java/cz/curatas/dto/ItemDtos.java#L135-L138):
```java
public record CreateItemRequest(
    @NotBlank(message = "Title is required")
    @jakarta.validation.constraints.Size(max = 1000, message = "Title must not exceed 1000 characters")
    String title,
    @jakarta.validation.constraints.Size(max = 255)
    String accessionNumber,
    @jakarta.validation.constraints.Size(max = 255)
    String inventoryNumber,
    ...
```

**Kritický nesoulad s pravidly CITEM:**
- CITEM stanovil: *„Alespoň jedno z polí Typ a Název předmětu musí být vyplněno.“*
- Backend však v `CreateItemRequest` obsahuje pevnou anotaci `@NotBlank` na poli `title`.
- Pokud kurátor zadá Typ předmětu (např. „Mince“) a pole Název (`title`) nevyplní, Spring MVC vyhodí výjimku `MethodArgumentNotValidException` (HTTP 400 Bad Request: `Title is required`).
- Naopak pole `inventoryNumber` nemá v `CreateItemRequest` anotaci `@NotBlank` (pokud chybí, backend v `InternalItemController` vygeneruje provizorní číslo `TEMP-...`).

**Požadovaná úprava backendu (do budoucna):**
1. Odstranit `@NotBlank` z `title` v `CreateItemRequest`.
2. Přidat `@NotBlank` na `inventoryNumber` v `CreateItemRequest`.
3. Přidat třídní validátor ověřující:
   ```java
   @AssertTrue(message = "Musí být vyplněn alespoň Název (title) nebo Typ předmětu (objectType)")
   public boolean isTitleOrObjectTypeFilled() {
       return (title != null && !title.isBlank()) || (objectType != null && !objectType.isBlank());
   }
   ```
**FE přemostění (okamžitě bezpečné):** Pokud je zadán `objectType` a `title` je prázdný, FE před odesláním na BE nastaví `title = objectType`.

---

### 2.4 Pokročilé filtrování a vyhledávání – stav v BE
V [cz.curatas.dto.ItemSearchRequest](file:///D:/ProjektyJava/IdeaProjects/curatas-be/src/main/java/cz/curatas/dto/ItemSearchRequest.java) a [cz.curatas.repository.ItemSpecification](file:///D:/ProjektyJava/IdeaProjects/curatas-be/src/main/java/cz/curatas/repository/ItemSpecification.java):

#### Aktuálně podporovaná pole pro vyhledávání a filtrování:
- `q` (fulltextové vyhledávání napříč 19 textovými poli a autory)
- `accessionNumber`
- `inventoryNumber`
- `datingFrom`, `datingTo`
- `title`
- `author` (vyhledává jak v plochém poli `author`, tak v relaci `ItemPartyEntity`)
- `material`
- `technique`
- `subCollection` (odpovídá poli `core.item.sub_collection`)
- `objectType`
- `originPlace` (hledá v `originPlace` i `countryOfOrigin`)
- `location` (hledá v `locationBuilding`, `locationRoom`, `permanentLocation`)
- `spravce`
- `objectCondition`
- `worksetId`
- `advancedFilter` (podporuje rekurzivní skupiny AND/OR/NOT a operátory CONTAINS, EQUALS, STARTS_WITH, BETWEEN atd.)

#### NEPODPOROVANÁ pole v backendovém vyhledávání (požadavek CITEM):
| Požadované pole | Kde jsou data v DB | Stav v ItemSearchRequest | Stav v ItemSpecification | Dopad |
|---|---|---|---|---|
| **Zapsal** | `core.item.legacy_created_by` | Chybí getter/setter | Chybí mapování v `normalizeFieldName` | Podmínka je ignorována |
| **Určil** | `ItemMuseumRecordEntity` (`Urcil_UR`) | Chybí | Chybí | Podmínka je ignorována |
| **Fond** | `core.item.fund_dictionary_id`, `fund_legacy_code` | Chybí (je jen `subCollection`) | Chybí mapování pro `fund` | Podmínka je ignorována |

**Požadovaná úprava backendu:**
Doplnit do [ItemSpecification.java](file:///D:/ProjektyJava/IdeaProjects/curatas-be/src/main/java/cz/curatas/repository/ItemSpecification.java) podporu pro:
- `"zapsal" -> "legacyCreatedBy"`
- `"fond", "fund" -> "fundLegacyCode"` nebo vazbu na `fundDictionary`
- `"urcil" ->` subquery do `ItemMuseumRecordEntity` s `kind = 'DETERMINATION'` a podmínkou na `payload->>'Urcil_UR'`

---

### 2.5 Číselníky a správa hodnot ([DictionaryController.java](file:///D:/ProjektyJava/IdeaProjects/curatas-be/src/main/java/cz/curatas/controller/DictionaryController.java))
Metoda `GET /api/v1/dictionaries` vrací mapu:
- `objectTypes`
- `materials`
- `techniques`
- `countries`
- `authors`
- `spravci`
- `funds` (položky z `dictRepo` s `type = 'FUND'`)
- `groups`

**Zjištěný nedostatek:**
Endpoint nevrací klíč `subCollections`. Přitom v repository [ItemRepository.java](file:///D:/ProjektyJava/IdeaProjects/curatas-be/src/main/java/cz/curatas/repository/ItemRepository.java#L59) již existuje metoda `findDistinctSubCollections()`.
Pokud FE potřebuje nabízet existující podsbírky v dropdownu, je vhodné doplnit `"subCollections", repo.findDistinctSubCollections()` do odpovědi `GET /api/v1/dictionaries`. Do té doby může FE umožnit volné zadání textu s našeptáváním dříve použitých hodnot.

---

## 3. Specifikace potřebných změn API pro Backend Team

Následující úpravy jsou předány backendovému týmu k zapracování (nepředstavují překážku pro zahájení první etapy FE prací):

```java
// 1. cz.curatas.dto.ItemDtos.CreateItemRequest
// Odstranění striktní @NotBlank anotace z title ve prospěch kombinované validace
public record CreateItemRequest(
    @Size(max = 1000) String title,
    @NotBlank(message = "Inventární číslo je povinné") @Size(max = 255) String inventoryNumber,
    @Size(max = 255) String accessionNumber,
    ...
)

// 2. cz.curatas.dto.ItemSearchRequest
public class ItemSearchRequest {
    ...
    private String zapsal;
    private String urcil;
    private String fund;
    // + gettery a settery
}

// 3. cz.curatas.repository.ItemSpecification.normalizeFieldName
case "zapsal", "legacycreatedby", "legacy_created_by" -> "legacyCreatedBy";
case "fond", "fund", "fundlegacycode", "fund_legacy_code" -> "fundLegacyCode";

// 4. cz.curatas.controller.DictionaryController.getDictionaries
return Map.of(
    ...
    "funds", dbFunds,
    "subCollections", repo.findDistinctSubCollections(),
    "groups", dbGroups
);
```
