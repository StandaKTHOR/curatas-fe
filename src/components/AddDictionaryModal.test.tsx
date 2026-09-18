// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AddDictionaryModal from './AddDictionaryModal';
import { createDictionaryItem } from '../lib/api';

vi.mock('../lib/api', () => ({
    createDictionaryItem: vi.fn(),
}));

describe('AddDictionaryModal - oprava chyby Nová země', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('submits country dictionary item correctly on button click', async () => {
        vi.mocked(createDictionaryItem).mockResolvedValue({
            id: 101,
            type: 'COUNTRY',
            code: 'FRANCIE',
            label: 'Francie'
        } as any);

        const handleSuccess = vi.fn();
        const handleClose = vi.fn();

        const { container } = render(
            <AddDictionaryModal
                isOpen={true}
                dictionaryType="COUNTRY"
                dictionaryTitle="Země původu"
                onClose={handleClose}
                onSuccess={handleSuccess}
            />
        );

        // Ověříme dynamický placeholder pro zemi
        const labelInput = container.querySelector('#dictLabel') as HTMLInputElement;
        expect(labelInput).not.toBeNull();
        expect(labelInput).toHaveAttribute('placeholder', 'např. Francie');

        // Vyplníme název
        await userEvent.type(labelInput, 'Francie');

        // Automaticky vygenerovaný kód
        const codeInput = container.querySelector('#dictCode') as HTMLInputElement;
        expect(codeInput).not.toBeNull();
        expect(codeInput).toHaveValue('FRANCIE');

        // Klikneme na odesílací tlačítko
        const submitBtn = screen.getByRole('button', { name: /Přidat a vybrat/i });
        expect(submitBtn).not.toBeDisabled();
        await userEvent.click(submitBtn);

        await waitFor(() => {
            expect(createDictionaryItem).toHaveBeenCalledWith({
                type: 'COUNTRY',
                code: 'FRANCIE',
                label: 'Francie'
            });
            expect(handleSuccess).toHaveBeenCalledWith({
                code: 'FRANCIE',
                label: 'Francie',
                type: 'COUNTRY'
            });
            expect(handleClose).toHaveBeenCalled();
        });
    });

    it('resets inputs when modal is reopened', () => {
        const { rerender, container } = render(
            <AddDictionaryModal
                isOpen={false}
                dictionaryType="COUNTRY"
                dictionaryTitle="Země původu"
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        );

        expect(screen.queryByText(/Přidat do číselníku/i)).not.toBeInTheDocument();

        rerender(
            <AddDictionaryModal
                isOpen={true}
                dictionaryType="COUNTRY"
                dictionaryTitle="Země původu"
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        );

        const labelInput = container.querySelector('#dictLabel') as HTMLInputElement;
        expect(labelInput).toHaveValue('');
    });
});
