import {useEffect, useMemo, useState} from 'react';
import type {ComponentProps} from 'react';
import BaseHeader from '../../components/PermanentIdentificationHeader';
import {useAuth} from '../../components/AuthContext';
import {useCatalog} from './CatalogContext';
import {scopedApi} from '../scoped/scopedApi';

type HeaderProps = ComponentProps<typeof BaseHeader>;
type Props = HeaderProps & {itemId?: number; readHistorical: boolean};
type Fields = {Fond_S: string | null; Predmet_S: string | null; Titul_S: string | null};

/** Display-only fallback. Historical values never enter editable form or save payload. */
function visibleValue<T extends string | null | undefined>(current: T, historical: string | null | undefined): T | string {
    if (typeof current === 'string' && current.trim() !== '') return current;
    if (typeof historical === 'string' && historical.trim() !== '') return `${historical} (DEMUS)`;
    return current;
}

function OriginalHistoricalHeader({itemId, ...props}: HeaderProps & {itemId: number}) {
    const {token} = useAuth();
    const {selectedCatalog} = useCatalog();
    const catalogId = selectedCatalog?.id;
    const api = useMemo(() => catalogId && token ? scopedApi(catalogId, token) : null, [catalogId, token]);
    const [source, setSource] = useState<{key: string; fields: Fields} | null>(null);
    const key = catalogId && itemId ? `${catalogId}:${itemId}` : null;

    useEffect(() => {
        setSource(null);
        if (!api || !catalogId) return;
        const controller = new AbortController();
        void Promise.all([
            api.sourceInventory(itemId, controller.signal),
            api.curatorRecord(itemId, 'inventory', controller.signal),
        ]).then(([evidence, inventory]) => {
            if (controller.signal.aborted) return;
            // Refuse to merge different revisions of the same item.
            if (evidence.itemVersion !== inventory.etag.slice(1, -1)) return;
            setSource({
                key: `${catalogId}:${itemId}`,
                fields: {
                    Fond_S: evidence.fields.Fond_S,
                    Predmet_S: evidence.fields.Predmet_S,
                    Titul_S: evidence.fields.Titul_S,
                },
            });
        }).catch(() => {
            if (!controller.signal.aborted) setSource(null);
        });
        return () => controller.abort();
    }, [api, catalogId, itemId]);

    // Key guards against showing the previous item's/catalog's source while loading.
    const historical = key && source?.key === key ? source.fields : null;
    return <BaseHeader
        {...props}
        fond={visibleValue(props.fond, historical?.Fond_S)}
        predmet={visibleValue(props.predmet, historical?.Predmet_S)}
        titul={visibleValue(props.titul, historical?.Titul_S)}
    />;
}

/** Preserve the original component and tests when historical reads are not enabled. */
export default function OriginalPermanentIdentificationHeader({itemId, readHistorical, ...props}: Props) {
    if (!readHistorical || !itemId || !Number.isSafeInteger(itemId) || itemId < 1) {
        return <BaseHeader {...props} />;
    }
    return <OriginalHistoricalHeader itemId={itemId} {...props} />;
}
