import {useAuth} from '../components/AuthContext';
import {useCatalog} from '../features/catalog/CatalogContext';
import LocalUsers from '../features/localAuth/LocalUsers';
import CatalogSharingPanel from '../features/catalog/CatalogSharingPanel';
import CatalogAuditViewer from '../features/catalog/CatalogAuditViewer';

export default function Admin(){
    const {token}=useAuth();
    const {selectedCatalog,clearAccess}=useCatalog();
    const caps=selectedCatalog?.capabilities??[];
    return (
        <div className='mx-auto max-w-3xl px-4 py-6'>
            <h1 className='text-2xl font-semibold'>Admin</h1>
            <p className='text-sm text-gray-600 mt-2'>Správa uživatelů, oprávnění a auditu vybraného katalogu.</p>
            <LocalUsers />
            {token && selectedCatalog && caps.includes('catalog.access.delegate') && (
                <CatalogSharingPanel catalogId={selectedCatalog.id} token={token} onDenied={clearAccess} />
            )}
            {token && selectedCatalog && caps.includes('catalog.audit.read') && (
                <CatalogAuditViewer catalogId={selectedCatalog.id} token={token} onDenied={clearAccess} />
            )}
        </div>
    )
}
