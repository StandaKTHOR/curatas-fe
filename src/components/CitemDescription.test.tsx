import {render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import Header from './DemusIdentificationHeader';
it('P1.2 keeps identity prominent while the editor suppresses the duplicate description summary',()=>{render(<Header inventoryNumber="ZV 818/2" popis="Existing source description" showDescription={false}/>);expect(screen.getByText('ZV 818/2')).toBeVisible();expect(screen.queryByText('Existing source description')).toBeNull();});
it('retains the description summary for existing header callers',()=>{render(<Header popis="Existing source description"/>);expect(screen.getByText('Existing source description')).toBeVisible();});
