import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PhotoPreview from './PhotoPreview';
vi.mock('../lib/api',()=>({API_BASE:'https://api.example.invalid',resolveApiUrl:(path:string)=>path.startsWith('http')?path:'https://api.example.invalid'+path}));
beforeEach(()=>{localStorage.setItem('token','TEST_ONLY_TOKEN');Object.defineProperty(URL,'createObjectURL',{configurable:true,value:vi.fn(()=>'blob:preview')});Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:vi.fn()});});
afterEach(()=>{localStorage.clear();vi.unstubAllGlobals();vi.useRealTimers();});
it('reopens protected full preview with Authorization and releases each blob',async()=>{
    const fetchMock=vi.fn().mockResolvedValue({ok:true,blob:async()=>new Blob(['synthetic'],{type:'image/png'})});vi.stubGlobal('fetch',fetchMock);
    render(<PhotoPreview src="/api/v1/media/items/7/photo.png" alt="Photo proof"/>);
    await userEvent.click(screen.getByRole('button',{name:'Náhled'}));await screen.findByAltText('Photo proof');
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.invalid/api/v1/media/items/7/photo.png',expect.objectContaining({headers:{Authorization:'Bearer TEST_ONLY_TOKEN'},credentials:'omit',redirect:'error'}));
    await userEvent.click(screen.getByRole('button',{name:'Zavřít náhled'}));expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    await userEvent.click(screen.getByRole('button',{name:'Náhled'}));await screen.findByAltText('Photo proof');expect(fetchMock).toHaveBeenCalledTimes(2);
});
it.each([403,'html'])('reports rejected/malformed preview %s without showing a broken image',async result=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(result===403?{ok:false,status:403}:{ok:true,blob:async()=>new Blob(['login'],{type:'text/html'})}));
    render(<PhotoPreview src="/api/v1/media/items/7/photo.png" alt="Photo proof"/>);await userEvent.click(screen.getByRole('button',{name:'Náhled'}));
    await screen.findByRole('alert');expect(screen.queryByAltText('Photo proof')).not.toBeInTheDocument();expect(URL.createObjectURL).not.toHaveBeenCalled();
});
it('aborts a stalled preview after the bounded timeout',async()=>{
    vi.useFakeTimers();vi.stubGlobal('fetch',vi.fn(()=>new Promise(()=>{})));
    render(<PhotoPreview src="/api/v1/media/items/7/photo.png" alt="Photo proof"/>);
    screen.getByRole('button',{name:'Náhled'}).click();await act(async()=>{});
    await act(async()=>{vi.advanceTimersByTime(15000);});expect(screen.getByRole('alert')).toHaveTextContent('15 sekund');
});