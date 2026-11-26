import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import AdditionalAuthorsLink from './AdditionalAuthorsLink';
import {bindOriginalCatalog} from './originalAdapter';
import {applyOriginalEditBoundary} from './originalEdit';
const catalog={id:1,code:'G',name:'Generated',version:0,institution:{id:1,code:'G',name:'Generated'},capabilities:['catalog.read','item.read','item.professional.write'],professionalWriteEnabled:true};
beforeEach(()=>{vi.stubEnv('VITE_ORIGINAL_SCOPED_TEST','true');vi.stubEnv('VITE_CURRENT_AUTHORS_ENABLED','true');bindOriginalCatalog(catalog,'generated');});
afterEach(()=>{cleanup();bindOriginalCatalog(null,null);vi.unstubAllEnvs();});
it('opens the existing editor without legacy parties or an API mutation and survives the edit boundary',()=>{
 const open=vi.fn(),{container}=render(<AdditionalAuthorsLink itemId={3} readOnly={false} blocked={false} onOpen={open}/>);
 applyOriginalEditBoundary(container,'professional',true,false);
 const button=screen.getByRole('button',{name:'+ Další role / tvůrce'});expect(button).toBeEnabled();fireEvent.click(button);expect(open).toHaveBeenCalledOnce();
});
it.each([{readOnly:true,blocked:false,itemId:3},{readOnly:false,blocked:true,itemId:3},{readOnly:false,blocked:false,itemId:undefined}])('refuses unavailable, busy or new item contexts %#',props=>{
 const open=vi.fn(),{container}=render(<AdditionalAuthorsLink {...props} onOpen={open}/>);
 applyOriginalEditBoundary(container,'professional',true,false);
 const button=screen.getByRole('button');expect(button).toBeDisabled();fireEvent.click(button);expect(open).not.toHaveBeenCalled();
});
it('refuses missing professional capability',()=>{bindOriginalCatalog({...catalog,capabilities:['catalog.read','item.read']},'reader');render(<AdditionalAuthorsLink itemId={3} readOnly={false} blocked={false} onOpen={vi.fn()}/>);expect(screen.getByRole('button')).toBeDisabled();});
