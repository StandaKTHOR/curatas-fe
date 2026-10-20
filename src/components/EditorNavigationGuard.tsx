import {useContext, useEffect} from 'react';
import {UNSAFE_DataRouterContext, useBlocker} from 'react-router-dom';

type Props = {isDirty: () => boolean; isSaving: () => boolean};
function DataGuard({isDirty, isSaving}: Props) {
    const blocker = useBlocker(() => isSaving() || isDirty());
    useEffect(() => {
        if (blocker.state !== 'blocked') return;
        if (isSaving()) {blocker.reset(); return;}
        if (window.confirm('Máte neuložené změny. Opravdu chcete odejít bez uložení?')) blocker.proceed();
        else blocker.reset();
    }, [blocker, isSaving]);
    return null;
}
export default function EditorNavigationGuard(props: Props) {
    const dataRouter = useContext(UNSAFE_DataRouterContext);
    return dataRouter ? <DataGuard {...props}/> : null;
}
