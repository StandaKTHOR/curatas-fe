import {registryLabels,literatureFields,partyFields} from './professionalRegistryApi';
/** Explicit professional labels only. Service columns, source identities and raw JSON are never rendered. */
export const professionalDictionaryLabels:Record<string,Record<string,string>>={
 AUTHOR:{DatNar_OS:'Narození',DatUmr_OS:'Úmrtí',MistoNar_OS:'Místo narození',MistoUmr_OS:'Místo úmrtí',Medailon_OS:'Medailon',Okruh_OS:'Odborný okruh',PlusT_OS:'Doplňující údaje'},
 LOCALITY:{Zeme_L:'Země',Stat_L:'Stát',Oblast_L:'Oblast',Okres_L:'Okres',Katastr_L:'Katastr',NmVyska_L:'Nadmořská výška',ZSirka_L:'Zeměpisná šířka',ZDelka_L:'Zeměpisná délka',Ctverec_L:'Čtverec',Mapa_L:'Mapa',Pozn_L:'Poznámka',PlusT_L:'Doplňující údaje'},
 MATERIAL:{Pozn_MA:'Poznámka'},TECHNIQUE:{Pozn_TE:'Poznámka'},FUND:{Pozn_FN:'Poznámka'},GROUP:{Pozn_SK:'Poznámka'},OBJECT_TYPE:{Pozn_NZ:'Poznámka'},AUTHOR_ROLE:{Pozn_RO:'Poznámka'},
 COLLECTION:{Sbirka_PB:'Sbírka (kód)',Obor_PB:'Obor (kód)'},
 COUNTRY:{LatNazev_ST:'Latinský název',Reg_ST:'Region',LatReg_ST:'Latinský název regionu'},
 CADASTRE:{ZkrSt_KT:'Stát (kód)',COkr_KT:'Okres (kód)',CObce_KT:'Obec (kód)',Mapa_KT:'Mapa'},
 DISTRICT:{ZkrSt_OK:'Stát (kód)',Zeme_OK:'Země',ZkrOkr_OK:'Zkratka okresu'},
 ISO_MATERIAL:{KodMatISO_MI:'Kód materiálu ISO'},CURRENCY:{MenaCSN_ME:'Kód měny ČSN'},
 REGION:{Pozn_OB:'Poznámka'},DATING:{Pozn_DT:'Poznámka'},LITERATURE_AUTHOR:{ZkrJm_AL:'Zkrácené jméno',Pozn_AL:'Poznámka'},PERIODICAL:{ISBN_PE:'ISBN',ISSN_PE:'ISSN',Nakl_PE:'Nakladatel',Pozn_PE:'Poznámka'},ACQUISITION_METHOD:{Pozn_ZA:'Poznámka'},DISPOSAL_REASON:{Pozn_DV:'Poznámka'},LOSS_METHOD:{Pozn_ZU:'Poznámka'},LITERATURE_PROCESSING:{Pozn_ZR:'Poznámka'},
 DIMENSION:{Jedn_RZ:'Jednotka',Slovy_RZ:'Význam rozměru',Zarazeni_RZ:'Zařazení'},
 DIRECTORY:{KodSpr_A:'Kód správce',Okruh_A:'Okruh',Jmeno_A:'Jméno',Prijmeni_A:'Příjmení',Inst_A:'Instituce',Funkce_A:'Funkce',Typ_A:'Druh subjektu',TitPred_A:'Titul před jménem',TitZa_A:'Titul za jménem',Osloveni_A:'Oslovení',Obec_A:'Obec',Ulice_A:'Ulice',PSC_A:'PSČ',Stat_A:'Stát',Tel_A:'Telefon',Email_A:'E-mail',ICO_A:'IČO',DIC_A:'DIČ',Pozn_A:'Poznámka',...Object.fromEntries(partyFields.map(k=>[k,registryLabels[k]]))},
 LITERATURE:Object.fromEntries(literatureFields.map(k=>[k,registryLabels[k]])),
};
export default function DictionaryProfessionalFields({type,fields}:{type:string;fields?:Record<string,unknown>|null}){
 const entries=Object.entries(professionalDictionaryLabels[type]??{}).flatMap(([key,label])=>{const raw=fields?.[key];const v=raw&&typeof raw==='object'?(raw as {value?:unknown}).value:raw;if(v===undefined||v===null||v==='')return [];return [[label,key==='partyType'?(v==='PERSON'?'Osoba':v==='ORGANIZATION'?'Organizace':String(v)):String(v)]];});
 if(!entries.length)return null;
 return <dl aria-label="Odborné údaje položky">{entries.map(([label,value])=><div key={label}><dt>{label}</dt><dd style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{value}</dd></div>)}</dl>;
}
