import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAdminItems, deleteAdminItem } from '../lib/api'

export default function AdminItems() {
    const [data, setData] = useState<any>(null);
    const [page, setPage] = useState(0);
    const navigate = useNavigate();

    // Načítáme data s limitem 1000 pro demo účely
    const loadData = () => listAdminItems(page, 50).then(setData);

    useEffect(() => { loadData(); }, [page]);

    const handleDelete = async (id: number) => {
        if (window.confirm('Opravdu chcete tento exponát trvale smazat? Tato akce bude zaznamenána.')) {
            await deleteAdminItem(id);
            loadData();
        }
    };

    if (!data) return <div className="p-10 text-center italic text-gray-400">Načítám správu sbírek...</div>

    return (
        <div className="card shadow-sm border-0">
            <div className="card-header bg-white py-4 flex justify-between items-center border-b">
                <h4 className="card-title m-0 font-bold text-[#1f262d]">Správa exponátů ({data.totalElements})</h4>
                <button onClick={() => navigate('/admin/items/new')} className="btn btn-warning shadow-sm font-bold text-xs uppercase px-4 py-2">
                    + Nový předmět
                </button>
            </div>
            <div className="card-body p-0">
                <div className="table-responsive">
                    <table className="table table-hover mb-0">
                        <thead className="bg-[#f8f9fa] text-[10px] uppercase tracking-wider text-gray-500">
                        <tr>
                            <th className="px-6 py-4" style={{ width: '20%' }}>Inv. číslo</th>
                            <th className="px-6 py-4" style={{ width: '45%' }}>Název</th>
                            <th className="px-6 py-4 text-center" style={{ width: '15%' }}>Stav</th>
                            <th className="px-6 py-4 text-right" style={{ width: '20%' }}>Akce</th>
                        </tr>
                        </thead>
                        <tbody className="text-sm">
                        {data.content.map((it: any) => (
                            <tr key={it.id} className="border-b border-gray-50 align-middle">
                                {/* 1. SLOUPEC: Inventární číslo z DB */}
                                <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                    {it.inventoryNumber || it.accessionNumber || '—'}
                                </td>

                                {/* 2. SLOUPEC: Název předmětu */}
                                <td className="px-6 py-4 font-bold text-[#3e5569]">
                                    {it.title}
                                </td>

                                {/* 3. SLOUPEC: Stav publikace */}
                                <td className="px-6 py-4 text-center">
                                    <span className={`badge ${it.published ? 'bg-success' : 'bg-secondary'} text-[9px] uppercase px-2 py-1`}>
                                        {it.published ? 'Publikováno' : 'Koncept'}
                                    </span>
                                </td>

                                {/* 4. SLOUPEC: Tlačítka akcí */}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => navigate(`/admin/items/edit/${it.id}`)}
                                            className="genric-btn info-border circle small px-3 py-1"
                                            style={{ lineHeight: '20px', textTransform: 'none' }}
                                        >
                                            Upravit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(it.id)}
                                            className="genric-btn danger-border circle small px-3 py-1"
                                            style={{ lineHeight: '20px', textTransform: 'none' }}
                                        >
                                            Smazat
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Stránkování */}
            <div className="p-4 border-t flex justify-center gap-2 bg-[#f8f9fa]">
                <button disabled={page === 0} onClick={() => setPage(page - 1)} className="genric-btn gray-border radius small">Předchozí</button>
                <span className="py-2 px-3 text-xs font-bold text-gray-500">Strana {page + 1}</span>
                <button disabled={data.last} onClick={() => setPage(page + 1)} className="genric-btn gray-border radius small">Další</button>
            </div>
        </div>
    )
}