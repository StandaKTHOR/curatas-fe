import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,expect,it,vi} from 'vitest';
import AdminItems from './AdminItems';
import * as api from '../lib/api';
vi.mock('../lib/api',async original=>({...await original<typeof import('../lib/api')>(),listAdminItems:vi.fn(),listWorksets:vi.fn()}));
beforeEach(()=>{vi.resetAllMocks();sessionStorage.clear();vi.mocked(api.listWorksets).mockResolvedValue([]);});

it('Update462 uses the existing current FUND caption before the separate historical fund code',async()=>{
 const entry=Object.freeze({id:7,title:'GENERATED FUND',inventoryNumber:'GEN-FUND',fund:'CURRENT FUND',fundLegacyCode:'SOURCE FUND'});
 vi.mocked(api.listAdminItems).mockResolvedValue({content:[entry],totalPages:1,totalElements:1} as any);
 render(<MemoryRouter><AdminItems/></MemoryRouter>);expect(await screen.findByText('CURRENT FUND')).toBeVisible();expect(screen.queryByText('SOURCE FUND')).toBeNull();expect(entry.fundLegacyCode).toBe('SOURCE FUND');
});
