import {originalIntegrationEnabled,originalSession} from '../features/catalog/originalAdapter';
import ScopedFeedbackQueue from '../features/catalog/ScopedFeedbackQueue';
import { useRef,useState } from 'react';
import { sendFeedback } from '../lib/api';

export default function Feedback() {
    const pending=useRef<{catalog:number;id:string;message:string}|null>(null);
    const [msg, setMsg] = useState('');
    const [ok, setOk] = useState('');
    const [err, setErr] = useState('');
    const [sending, setSending] = useState(false);
    let scopedAvailable=true;if(originalIntegrationEnabled()){try{originalSession();}catch{scopedAvailable=false;}}

    async function submit() {
        if(sending)return;
        setErr('');
        setOk('');
        if (msg.trim().length < 10) {
            setErr('Zpráva připomínky musí mít alespoň 10 znaků.');
            return;
        }
        setSending(true);
        try {
            let r;
            if(originalIntegrationEnabled()){
                const {api,catalog,signal}=originalSession();if(pending.current?.catalog!==catalog.id)pending.current={catalog:catalog.id,id:crypto.randomUUID(),message:msg};
                if(pending.current.message!==msg)throw new Error('Původní odeslání nebylo potvrzeno. Před opakováním obnovte původní text; nový požadavek nebyl odeslán.');
                r=await api.submitFeedback(pending.current.id,msg,signal);if(signal.aborted)return;pending.current=null;
            }else r=await sendFeedback({ targetType: 'GENERAL', message: msg, consentToContact: false });
            setOk(`Připomínka byla úspěšně odeslána (ID: ${r.feedbackId}). Děkujeme!`);
            setMsg('');
        } catch (e: any) {
            setErr(String(e.message || e));
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
            <h1 className="text-2xl font-semibold text-gray-900">Připomínka k systému</h1>
            <p className="text-xs text-gray-500">Máte návrh na zlepšení nebo jste narazili na chybu? Napište nám ji níže.</p>
            {!scopedAvailable&&<p role="status">Pro odeslání připomínky se přihlaste a vyberte dostupný katalog.</p>}
            <textarea
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm min-h-36 focus:outline-none focus:border-[#00204a]"
                value={msg}
                onChange={e => setMsg(e.target.value)}
                placeholder="Napište podrobnější popis připomínky (min. 10 znaků)..."
            />
            <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Délka: {msg.trim().length} / min. 10 znaků</span>
                <button
                    type="button"
                    className="rounded-xl bg-[#00204a] text-white px-5 py-2 text-sm font-bold hover:bg-blue-900 disabled:opacity-50 cursor-pointer"
                    onClick={submit}
                    disabled={sending||!scopedAvailable}
                >
                    {sending ? 'Odesílám...' : 'Odeslat připomínku'}
                </button>
            </div>
            {ok && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">{ok}</div>}
            {originalIntegrationEnabled()&&<ScopedFeedbackQueue/>}
            {err && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">{err}</div>}
        </div>
    );
}
