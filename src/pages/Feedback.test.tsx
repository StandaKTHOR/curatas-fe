import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Feedback from './Feedback';
import * as api from '../lib/api';

describe('Feedback Page - Připomínky End-to-End Flow', () => {
    it('shows validation error when submitting message under 10 characters', async () => {
        render(
            <MemoryRouter>
                <Feedback />
            </MemoryRouter>
        );

        const textarea = screen.getByPlaceholderText(/Napište podrobnější popis/i);
        const button = screen.getByRole('button', { name: /Odeslat připomínku/i });

        fireEvent.change(textarea, { target: { value: 'Krátká' } });
        fireEvent.click(button);

        expect(await screen.findByText('Zpráva připomínky musí mít alespoň 10 znaků.')).toBeInTheDocument();
    });

    it('successfully calls sendFeedback API and displays confirmation on valid message', async () => {
        const mockSend = vi.spyOn(api, 'sendFeedback').mockResolvedValue({ feedbackId: 123 } as any);

        render(
            <MemoryRouter>
                <Feedback />
            </MemoryRouter>
        );

        const textarea = screen.getByPlaceholderText(/Napište podrobnější popis/i);
        const button = screen.getByRole('button', { name: /Odeslat připomínku/i });

        fireEvent.change(textarea, { target: { value: 'Toto je platná testovací zpráva s délkou nad 10 znaků.' } });
        fireEvent.click(button);

        await waitFor(() => {
            expect(mockSend).toHaveBeenCalledWith({
                targetType: 'GENERAL',
                message: 'Toto je platná testovací zpráva s délkou nad 10 znaků.',
                consentToContact: false
            });
        });

        expect(await screen.findByText(/Připomínka byla úspěšně odeslána \(ID: 123\)/i)).toBeInTheDocument();
    });
});
