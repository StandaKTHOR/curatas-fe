// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ItemListPrint, { PrintItemRow } from './ItemListPrint';

describe('ItemListPrint component', () => {
    const mockItems: PrintItemRow[] = [
        {
            id: 1,
            inventoryNumber: 'INV-001',
            accessionNumber: 'ACC-001',
            title: 'Starý obraz',
            author: 'Josef Mánes',
            datingText: '19. stol.',
            material: 'plátno',
            technique: 'olejomalba',
            subCollection: 'Obrazy',
            permanentLocation: 'Depozitář A'
        },
        {
            id: 2,
            inventoryNumber: 'INV-002',
            accessionNumber: 'ACC-002',
            title: 'Keramická váza',
            author: 'Neznámý',
            datingText: '1920',
            material: 'keramika',
            technique: 'glazování',
            subCollection: 'Užitné umění',
            permanentLocation: 'Expozice 1'
        }
    ];

    it('renders print modal and table with all items', () => {
        const handleClose = vi.fn();
        render(
            <ItemListPrint
                items={mockItems}
                totalCount={2}
                onClose={handleClose}
            />
        );

        expect(screen.getByText('Tisk inventárního soupisu')).toBeDefined();
        expect(screen.getByText('Starý obraz')).toBeDefined();
        expect(screen.getByText('Keramická váza')).toBeDefined();
        expect(screen.getByText('INV-001')).toBeDefined();
        expect(screen.getByText('INV-002')).toBeDefined();
        expect(screen.queryByText(/Bezpečnostní limit tisku:/)).toBeNull();
    });

    it('shows truncation warning banner when items are limited by safety cap', () => {
        const handleClose = vi.fn();
        render(
            <ItemListPrint
                items={mockItems}
                totalCount={150}
                onClose={handleClose}
            />
        );

        expect(screen.getByText(/Bezpečnostní limit tisku:/)).toBeDefined();
        expect(screen.getByText(/omezena na prvních 2 z celkových 150 nalezených položek/)).toBeDefined();
    });

    it('triggers window.print when clicking print button', () => {
        const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
        render(
            <ItemListPrint
                items={mockItems}
                totalCount={2}
                onClose={() => {}}
            />
        );

        const printButton = screen.getByRole('button', { name: /Vytisknout/i });
        fireEvent.click(printButton);
        expect(printSpy).toHaveBeenCalledTimes(1);
        printSpy.mockRestore();
    });

    it('triggers onClose when clicking close button', () => {
        const handleClose = vi.fn();
        render(
            <ItemListPrint
                items={mockItems}
                totalCount={2}
                onClose={handleClose}
            />
        );

        const closeButton = screen.getByRole('button', { name: /Zavřít náhled/i });
        fireEvent.click(closeButton);
        expect(handleClose).toHaveBeenCalledTimes(1);
    });
});
