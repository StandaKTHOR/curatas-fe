import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPublicItems } from '../lib/api';

export default function Catalog() {
    const [items, setItems] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            listPublicItems({ q: searchTerm })
                .then(data => setItems(data.content || []))
                .catch(console.error);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    return (
        <div className="container-fluid animate-in fade-in duration-500">
            <div className="mb-8 border-l-4 border-[#ffbc34] pl-4">
                <h2 className="text-3xl font-serif font-bold text-[#1f262d]">Sbírkový fond</h2>
                <p className="text-gray-500 text-sm uppercase tracking-widest">Kompletní evidence muzejních předmětů</p>
            </div>

            <div className="bg-white p-6 shadow-sm mb-10 border border-gray-100 rounded">
                <div className="input-group-icon">
                    <div className="icon"><i className="fa fa-search" aria-hidden="true"></i></div>
                    <input
                        className="single-input border"
                        placeholder="Zadejte název (např. truhla) nebo inventární číslo..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                {searchTerm && (
                    <p className="text-xs text-gray-400 mt-2">
                        Nalezeno {items.length} výsledků pro: "{searchTerm}"
                    </p>
                )}
            </div>

            <div className="row">
                {items.length > 0 ? items.map(it => (
                    <div key={it.id} className="col-lg-3 col-md-6 mb-8">
                        <div className="card h-100 shadow-sm border-0 transition-all hover:shadow-md">
                            <div className="aspect-[4/3] overflow-hidden bg-gray-50">
                                <img
                                    src={it.primaryImageUrl || 'https://via.placeholder.com/400x300?text=Bez+fotografie'}
                                    className="card-img-top object-cover w-full h-full"
                                    alt={it.title}
                                />
                            </div>
                            <div className="card-body p-4 flex flex-col justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-[#ffbc34] uppercase mb-1">
                                        {it.accessionNumber || 'Bez přírůstkového č.'}
                                    </p>
                                    <h5 className="card-title font-bold text-sm mb-3 line-clamp-2" style={{minHeight: '2.5rem'}}>
                                        {it.title}
                                    </h5>
                                </div>
                                <Link to={`/items/${it.id}`} className="genric-btn primary-border small radius w-full text-center mt-2">
                                    Otevřít kartu
                                </Link>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-12 text-center py-20 italic text-gray-400">
                        Nebyl nalezen žádný předmět odpovídající zadání.
                    </div>
                )}
            </div>
        </div>
    );
}