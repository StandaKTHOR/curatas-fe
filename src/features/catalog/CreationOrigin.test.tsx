import {render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {bindOriginalCatalog} from './originalAdapter';import CreationOrigin from './CreationOrigin';
const catalog={id:1,code:'GENERATED',name:'Generated',version:0,institution:{id:1,code:'GEN',name:'Generated'},capabilities:['catalog.read','item.read']};
const current={catalogId:1,itemId:3,itemVersion:1,origin:'MES_CREATED',createdAt:'2026-11-05T10:00:00Z',createdBy:2,createdBySubject:'local:private-identifier',createdByLabel:'Žofie Kurátorka',modifiedAt:'2026-11-05T11:00:00Z',modifiedBy:4,modifiedByLabel:'Jiří Správce'};
const response=(value:unknown)=>new Response(JSON.stringify(value),{headers:{ETag:'"1"','Cache-Control':'no-store'}});
beforeEach(()=>{vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','false');bindOriginalCatalog(catalog,'token');});afterEach(()=>{bindOriginalCatalog(null,null);vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('shows actual current actor names and audit dates without exposing auth subjects or asserting DEMUS metadata',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(current)));render(<CreationOrigin itemId={3} parentEtag={'"1"'}/>);await screen.findByText('Žofie Kurátorka');expect(screen.getByText('Jiří Správce')).toBeInTheDocument();expect(document.body.textContent).not.toContain('local:private-identifier');expect(screen.getAllByRole('term').map(n=>n.textContent)).toEqual(['Vytvořil v MES','Datum založení v MES','Změnil v MES','Datum poslední doložené změny v MES']);
});
it('shows current modification for historical items without inventing a MES creator',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({...current,origin:'UNRECORDED',createdAt:null,createdBy:null,createdBySubject:null,createdByLabel:null})));render(<CreationOrigin itemId={3}/>);await screen.findByText('Jiří Správce');expect(screen.queryByText('Vytvořil v MES')).not.toBeInTheDocument();
});
it('refreshes on parent version changes and rejects stale metadata',async()=>{
 const fetch=vi.fn().mockResolvedValue(response(current));vi.stubGlobal('fetch',fetch);const view=render(<CreationOrigin itemId={3} parentEtag={'"1"'}/>);await screen.findByText('Žofie Kurátorka');view.rerender(<CreationOrigin itemId={3} parentEtag={'"2"'}/>);await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(2));await screen.findByText('Metadata založení se nepodařilo ověřit.');expect(screen.queryByText('Žofie Kurátorka')).not.toBeInTheDocument();
});
