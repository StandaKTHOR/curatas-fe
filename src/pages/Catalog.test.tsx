import {DEFAULT_COLUMNS} from '../components/ColumnSelectorModal';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Catalog from './Catalog';
import * as api from '../lib/api';

vi.mock('../lib/api', () => ({
  listPublicItems: vi.fn(),
  API_BASE: '',
  resolveApiUrl: (path: string) => path,
}));

describe('Catalog Page UAT State Preservation', () => {
  it('reports an API failure without claiming an empty result and retries the existing search', async () => {
    const request = vi.spyOn(api, 'listPublicItems').mockRejectedValueOnce(new Error('Invalid curator page: sort'))
      .mockResolvedValue({content: [{id: '1', inventoryNumber: 'RETRY-42', title: 'Recovered item'}], totalPages: 1, totalElements: 1});
    render(<MemoryRouter initialEntries={['/?q=retained']}><Catalog /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid curator page: sort');
    expect(screen.queryByText(/Žádný předmět/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Počet nedostupný').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', {name: 'Načíst znovu'}));
    expect(await screen.findByText('RETRY-42')).toBeInTheDocument();
    expect(request).toHaveBeenLastCalledWith(expect.objectContaining({q: 'retained', page: 0}));
  });
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('correctly reads state, page, sorting and filter variables from URL search parameters', async () => {
    const mockList = vi.spyOn(api, 'listPublicItems').mockResolvedValue({
      content: [
        {
          id: 'item-1',
          inventoryNumber: 'INV-100',
          accessionNumber: 'ACC-200',
          title: 'Obraz krajiny',
          author: 'František Novák',
          datingText: '19. století',
          material: 'Plátno',
          subCollection: 'Výtvarné umění',
          locationBuilding: 'Budova A',
          locationRoom: 'Místnost 101',
        }
      ],
      totalPages: 1,
      totalElements: 1,
    });

    render(
      <MemoryRouter initialEntries={['/?page=2&sort=title,desc&q=Krajina&inventoryNumber=INV-100']}>
        <Catalog />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith({
        page: 2,
        size: 50,
        sort: 'title,desc',
        q: 'Krajina',
        accessionNumber: '',
        inventoryNumber: 'INV-100',
        title: '',
        author: '',
        material: '',
        datingFrom: '',
        datingTo: '',
        subCollection: '',
        objectType: '',
        originPlace: '',
        technique: '',
        spravce: '',
      });
    });

    expect(await screen.findByText('INV-100')).toBeInTheDocument();
    expect(screen.getByText('ACC-200')).toBeInTheDocument();
    expect(screen.getByText('Obraz krajiny')).toBeInTheDocument();
    expect(screen.getByText('František Novák')).toBeInTheDocument();
  });

  it('publicCatalog_doesNotRenderCloneAction: does not render Akce column or Klonovat action', async () => {
    vi.spyOn(api, 'listPublicItems').mockResolvedValue({
      content: [
        {
          id: 'item-1',
          inventoryNumber: 'INV-100',
          title: 'Obraz krajiny',
        }
      ],
      totalPages: 1,
      totalElements: 1,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Catalog />
      </MemoryRouter>
    );

    expect(await screen.findByText('INV-100')).toBeInTheDocument();
    expect(screen.queryByText('Akce')).not.toBeInTheDocument();
    expect(screen.queryByText('Klonovat')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Selektivně klonovat předmět')).not.toBeInTheDocument();
  });
});
it('fills only the four existing cells with the read-only summary and DEMUS markers',async()=>{
 localStorage.setItem('curatas_catalog_columns',JSON.stringify(DEFAULT_COLUMNS.map(v=>({...v,visible:v.id==='technique'||v.visible}))));
 vi.spyOn(api,'listPublicItems').mockResolvedValue({content:[{id:'summary-1',title:'GENERATED SUMMARY',inventoryNumber:'SUM-1',catalogSummary:{author:[{value:'Původní autor [malíř]',origin:'DEMUS_SOURCE',identity:'a'}],material:[{value:'papírmaš, papír',origin:'DEMUS_SOURCE',identity:'m'}],technique:[{value:'batika vosková - špendlík',origin:'DEMUS_SOURCE',identity:'t'}],accessionNumber:[{value:'Etn 11/99',origin:'DEMUS_SOURCE',identity:'q'}]}}],totalPages:1,totalElements:1});
 render(<MemoryRouter><Catalog/></MemoryRouter>);expect(await screen.findByText('Původní autor [malíř] (DEMUS)')).toBeInTheDocument();expect(screen.getByText('papírmaš, papír (DEMUS)')).toBeInTheDocument();expect(screen.getByText('batika vosková - špendlík (DEMUS)')).toBeInTheDocument();expect(screen.getByText('Etn 11/99 (DEMUS)')).toBeInTheDocument();localStorage.removeItem('curatas_catalog_columns');
});
