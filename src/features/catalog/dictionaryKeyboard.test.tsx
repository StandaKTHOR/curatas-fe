import {fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {useState} from 'react';
import {dictionaryTypeToSearch} from './dictionaryKeyboard';
afterEach(()=>vi.unstubAllGlobals());
it('finds search by a stable field attribute and preserves the selected identity while typing',()=>{
 vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{fn(0);return 1;});const changed=vi.fn();
 function Form(){const [q,setQ]=useState('');return <div><select aria-label="Autor" value="authority-A" onChange={changed} onKeyDown={e=>dictionaryTypeToSearch(e,'AUTHOR',setQ)}><option value="authority-A">A</option><option value="authority-B">B</option></select><input data-dictionary-search="AUTHOR" aria-label="Hledat autoritu AUTHOR" value={q} onChange={()=>{}}/></div>;}
 render(<Form/>);fireEvent.keyDown(screen.getByLabelText('Autor'),{key:'G'});expect(screen.getByLabelText('Hledat autoritu AUTHOR')).toHaveFocus();expect(screen.getByLabelText('Hledat autoritu AUTHOR')).toHaveValue('G');expect(screen.getByLabelText('Autor')).toHaveValue('authority-A');expect(changed).not.toHaveBeenCalled();
});
it('leaves Tab, arrows, Enter, composition and modifier shortcuts to native navigation',()=>{
 const search=vi.fn();for(const event of [{key:'Tab'},{key:'ArrowDown'},{key:'Enter'},{key:' '},{key:'a',ctrlKey:true},{key:'x',altKey:true},{key:'v',metaKey:true},{key:'a',nativeEvent:{isComposing:true}}]){const preventDefault=vi.fn();dictionaryTypeToSearch({nativeEvent:{isComposing:false},...event,preventDefault} as any,'AUTHOR',search);expect(preventDefault).not.toHaveBeenCalled();}expect(search).not.toHaveBeenCalled();
});
