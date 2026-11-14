/** Same server bound; never silently truncate or pretend an oversized print succeeded. */
export function approveFullPrint(count:number,confirm:(text:string)=>boolean){
 if(!Number.isSafeInteger(count)||count<0)throw new Error('Počet předmětů pro tisk není ověřen. Načtěte seznam znovu.');
 if(count>10000)throw new Error('Úplný tisk podporuje nejvýše 10 000 předmětů. Zužte filtr nebo použijte menší pracovní sadu; žádná data nebyla oříznuta.');
 return count<=1000||confirm(`Tisk obsahuje ${count.toLocaleString('cs-CZ')} předmětů. Načtení a příprava mohou trvat desítky sekund. Pro rychlejší tisk zúžte filtr nebo použijte pracovní sadu. Pokračovat?`);
}
