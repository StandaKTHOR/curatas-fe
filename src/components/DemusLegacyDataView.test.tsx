import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DemusLegacyDataView from './DemusLegacyDataView';

describe('DemusLegacyDataView', () => {
    it('renders empty message when legacyData is null or empty', () => {
        render(<DemusLegacyDataView legacyData={null} />);
        expect(screen.getByText(/Žádná historická DEMUS data nejsou k dispozici/i)).toBeInTheDocument();
    });

    it('maps known keys to Czech human readable labels and hides null/empty values', () => {
        const data = {
            plus1t: 'Hodnota 1',
            pozn_vz: 'Vznik poznámka',
            emptyField: '',
            nullField: null
        };
        render(<DemusLegacyDataView legacyData={data} />);

        expect(screen.getAllByText(/Plus1T/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Hodnota 1/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Poznámka k vzniku/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/2 položky/i)).toBeInTheDocument();
    });
});
