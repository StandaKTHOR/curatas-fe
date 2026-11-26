import type {CatalogSummary} from '../scoped/scopedApi';
import {historicalEnabled} from './useHistoricalRows';
import {useEffect, useMemo, useState} from 'react';
import type {ComponentProps} from 'react';
import BaseHeader from '../../components/PermanentIdentificationHeader';
import {useAuth} from '../../components/AuthContext';
import {useCatalog} from './CatalogContext';
import {scopedApi} from '../scoped/scopedApi';

type HeaderProps = ComponentProps<typeof BaseHeader>;
type Props = HeaderProps & {itemId?: number; readHistorical: boolean;parentEtag?:string;clearedHistoryFields?:string[];catalogSummary?:CatalogSummary;summaryUnchanged?:Partial<Record<'author'|'accessionNumber'|'datingText',boolean>>};
type Fields = {Fond_S: string | null; Predmet_S: string | null; Titul_S: string | null;Autor_S?:string|null;Datace_S?:string|null;Popis_S?:string|null};

/** Display-only fallback. Historical values never enter editable form or save payload. */
function visibleValue<T extends string | null | undefined>(current: T, historical: string | null | undefined): T | string {
    if (typeof current === 'string' && current.trim() !== '') return current;
    if (typeof historical === 'string' && historical.trim() !== '') return historical;
    return current;
}

function OriginalHistoricalHeader({itemId,parentEtag,clearedHistoryFields=[], ...props}: Omit<Props,'readHistorical'> & {itemId: number}) {
    const {token} = useAuth();
    const {selectedCatalog} = useCatalog();
    const catalogId = selectedCatalog?.id;
    const api = useMemo(() => catalogId && token ? scopedApi(catalogId, token) : null, [catalogId, token]);
    const [source, setSource] = useState<{key: string;api:unknown; fields: Fields} | null>(null);
    const key = catalogId && itemId ? `${catalogId}:${itemId}:${parentEtag??''}` : null;

    useEffect(() => {
        setSource(null);
        if (!api || !catalogId) return;
        const controller = new AbortController();
        void Promise.all([
            api.sourceInventory(itemId, controller.signal),
            api.curatorRecord(itemId, 'inventory', controller.signal),
            historicalEnabled()?api.sourceHistory(itemId,'Sbirky',controller.signal):Promise.resolve(null),
        ]).then(([evidence, inventory,root]) => {
            if (controller.signal.aborted) return;
            // Refuse to merge different revisions of the same item.
            if (evidence.itemVersion !== inventory.etag.slice(1, -1)||parentEtag&&parentEtag!==inventory.etag||root&&root.etag!==inventory.etag) return;
            const typed=root?.state==='AVAILABLE'?root.items[0]?.fields:undefined;
            const rootText=(field:string)=>typed?.[field]?.kind==='TEXT'?String(typed[field].value):null;
            setSource({
                key:key!,api,
                fields: {
                    Fond_S: evidence.fields.Fond_S,
                    Predmet_S: evidence.fields.Predmet_S,
                    Titul_S: evidence.fields.Titul_S,
                    Autor_S:rootText('Autor_S'),Datace_S:rootText('Datace_S'),Popis_S:rootText('Popis_S'),
                },
            });
        }).catch(() => {
            if (!controller.signal.aborted) setSource(null);
        });
        return () => controller.abort();
    }, [api, catalogId, itemId,parentEtag,key]);

    // Key guards against showing the previous item's/catalog's source while loading.
    const historical = key && source?.key === key && source.api===api ? source.fields : null;
    const fields = [
        ['Fond', props.fond, historical?.Fond_S], ['Předmět', props.predmet, historical?.Predmet_S],
        ['Titul', props.titul, historical?.Titul_S], ['Autor', props.autor, historical?.Autor_S],
        ['Datace', props.datace, historical?.Datace_S],
    ] as const;
    const sourceFallbackFields = new Set<string>(fields.filter(([label, current, source]) => !current?.trim() && source?.trim()&&!clearedHistoryFields.includes(label)).map(([label]) => label));
    return <BaseHeader
        {...props}
        sourceFallbackFields={sourceFallbackFields}
        fond={visibleValue(props.fond, historical?.Fond_S)}
        predmet={visibleValue(props.predmet, historical?.Predmet_S)}
        titul={visibleValue(props.titul, historical?.Titul_S)}
        autor={visibleValue(props.autor,clearedHistoryFields.includes('Autor')?null:historical?.Autor_S)}
        datace={visibleValue(props.datace,clearedHistoryFields.includes('Datace')?null:historical?.Datace_S)}
        popis={visibleValue(props.popis,clearedHistoryFields.includes('Popis')?null:historical?.Popis_S)}
    />;
}

/** Preserve the original component and tests when historical reads are not enabled. */
export default function OriginalPermanentIdentificationHeader({itemId, readHistorical,parentEtag,catalogSummary,summaryUnchanged, ...props}: Props) {
    if(catalogSummary){
        const show=(field:'author'|'accessionNumber'|'datingText')=>props.isViewMode||summaryUnchanged?.[field]===true;
        const caption=(field:'author'|'accessionNumber'|'datingText')=>catalogSummary[field]?.map(v=>v.value).join(' · ');
        props={...props,...(show('accessionNumber')?{accessionNumber:caption('accessionNumber')} : {}),...(show('author')?{autor:caption('author')} : {}),...(show('datingText')&&catalogSummary.datingText?{datace:caption('datingText')}:{})};
        props.clearedHistoryFields=[...(props.clearedHistoryFields??[]),...(show('author')&&!catalogSummary.author.length?['Autor']:[]),...(show('datingText')&&catalogSummary.datingText?.length===0?['Datace']:[])];
    }
    if (!readHistorical || !itemId || !Number.isSafeInteger(itemId) || itemId < 1) {
        return <BaseHeader {...props} />;
    }
    return <OriginalHistoricalHeader itemId={itemId} parentEtag={parentEtag} {...props} />;
}
