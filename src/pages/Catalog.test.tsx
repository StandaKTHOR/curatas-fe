import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Catalog from './Catalog';
import * as api from '../lib/api';

vi.mock('../lib/api', () => ({
  listPublicItems: vi.fn(),
}));

describe('Catalog Page UAT State Preservation', () => {
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
        location: '',
        spravce: '',
      });
    });

    expect(await screen.findByText('INV-100')).toBeInTheDocument();
    expect(screen.getByText('ACC-200')).toBeInTheDocument();
    expect(screen.getByText('Obraz krajiny')).toBeInTheDocument();
    expect(screen.getByText('František Novák')).toBeInTheDocument();
  });
});
