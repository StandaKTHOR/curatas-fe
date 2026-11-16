import {render,screen,waitFor,fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,it,expect,vi} from 'vitest';
import SearchVocabulary from './SearchVocabulary';
import CuratorSearchForm,{putCondition,identifyGroup,withoutCondition,filterValueLabel} from './CuratorSearchForm';
import {originalSession} from '../features/catalog/originalAdapter';
vi.mock('../features/catalog/originalAdapter',()=>({originalSession:vi.fn()}));
const api={dictionaryValues:vi.fn(),dictionaryValue:vi.fn(),historicalVocabulary:vi.fn()};let controller:AbortController;
beforeEach(()=>{vi.resetAllMocks();controller=new AbortController();vi.mocked(originalSession).mockReturnValue({api,signal:controller.signal,catalog:{id:1,capabilities:['dictionary.read']}} as any);});
it('keeps an imported OR tree and missing ids while adding and individually removing an AND filter',()=>{
 const imported=identifyGroup({conjunction:'OR',conditions:[{field:'title',operator:'CONTAINS',value:'A'},{field:'author',operator:'EQUALS',value:'B'}],groups:[]} as any);
 const combined=identifyGroup(putCondition(imported,'Spravce_S','6MM'));expect(combined.conjunction).toBe('AND');expect(combined.groups[0].conjunction).toBe('OR');expect(combined.groups[0].conditions).toHaveLength(2);
 const removed=withoutCondition(combined,combined.groups[0].conditions[0].id);expect(removed.groups[0].conditions[0].value).toBe('B');expect(removed.conditions[0].value).toBe('6MM');
});
it('loads real dictionary pages, appends by identity and searches server-side without fabricating choices',async()=>{
 api.dictionaryValues.mockResolvedValueOnce({items:[{id:'one',label:'První'}],nextAfterId:'one'}).mockResolvedValueOnce({items:[{id:'two',label:'Druhá'}],nextAfterId:null}).mockResolvedValue({items:[],nextAfterId:null});
 const selected=vi.fn();render(<SearchVocabulary type="FUND" label="Fond" value="" onSelect={selected}/>);
 await userEvent.click(screen.getByRole('button',{name:'Načíst seznam Fond'}));await screen.findByRole('option',{name:'První'});await userEvent.click(screen.getByRole('button',{name:'Další hodnoty: Fond'}));await screen.findByRole('option',{name:'Druhá'});expect(screen.getByRole('option',{name:'První'})).toBeInTheDocument();
 await userEvent.selectOptions(screen.getByLabelText('Fond'),'two');expect(selected).toHaveBeenCalledWith('two');fireEvent.change(screen.getByLabelText('Hledat v seznamu Fond'),{target:{value:'železo'}});await waitFor(()=>expect(api.dictionaryValues).toHaveBeenLastCalledWith('FUND',controller.signal,undefined,'železo'));await screen.findByText('Žádná dostupná hodnota pro tento výběr.');
});
it('keeps equal historic labels as separate recordIds and refuses a changed source on page two',async()=>{
 api.historicalVocabulary.mockResolvedValueOnce({state:'AVAILABLE',sourceSha256:'a',items:[{recordId:'one',label:'Stejné'}],nextAfterId:'one'}).mockResolvedValueOnce({state:'AVAILABLE',sourceSha256:'b',items:[{recordId:'two',label:'Stejné'}],nextAfterId:null});
 render(<SearchVocabulary type="GROUP" label="Historická skupina" historical value="" onSelect={()=>{}}/>);await userEvent.click(screen.getByRole('button',{name:'Načíst seznam Historická skupina'}));await screen.findByRole('option',{name:'Stejné'});await userEvent.click(screen.getByRole('button',{name:'Další hodnoty: Historická skupina'}));await screen.findByRole('alert');expect(screen.getAllByRole('option',{name:'Stejné'})).toHaveLength(1);
});
it('reports a lookup API error separately from an empty choice list',async()=>{
 api.dictionaryValues.mockRejectedValue(Error('503'));render(<SearchVocabulary type="LOCALITY" label="Lokalita" value="" onSelect={()=>{}}/>);await userEvent.click(screen.getByRole('button',{name:'Načíst seznam Lokalita'}));await screen.findByRole('alert');expect(screen.queryByText('Žádná dostupná hodnota pro tento výběr.')).not.toBeInTheDocument();
});

it('keeps old URL filters editable without exposing sentinel tokens and sets exact day bounds',async()=>{
 const change=vi.fn(),filter=vi.fn();render(<CuratorSearchForm group={{id:'root',conjunction:'AND',conditions:[],groups:[]}} onChange={change} filters={{Rada_S:'ZV',JineC_S:'__NULL__'}} onFilter={filter}/>);
 await userEvent.click(screen.getByText('Další možnosti hledání',{exact:true}));await userEvent.click(screen.getByText('Uložené další filtry',{exact:true}));fireEvent.change(screen.getByLabelText('Uložený filtr Řada'),{target:{value:'AB'}});expect(filter).toHaveBeenCalledWith('Rada_S','AB');expect(screen.getByRole('option',{name:'Není uvedeno'})).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Revidovaná datace od'),{target:{value:'1900-01-01'}});expect(change).toHaveBeenLastCalledWith(expect.objectContaining({conditions:[expect.objectContaining({field:'datingFrom',operator:'BETWEEN',value:'1900-01-01',valueTo:'9999-12-31'})]}));
});

it('describes presence, absence and boolean filters without reversing their meaning',()=>{
 expect(filterValueLabel('__NULL__')).toBe('Není uvedeno');expect(filterValueLabel('__NOT_NULL__')).toBe('Je uvedeno');expect(filterValueLabel('__EMPTY__')).toBe('Je prázdné');expect(filterValueLabel('false')).toBe('Ne');expect(filterValueLabel('6MM')).toBe('6MM');
});
