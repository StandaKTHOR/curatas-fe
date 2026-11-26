import {cleanup, render, screen, within} from '@testing-library/react';
import {afterEach, expect, it} from 'vitest';
import PinnedItemIdentity from './PinnedItemIdentity';

afterEach(cleanup);

it('keeps inventory and accession distinct, preserves complete text and displays zero', () => {
    const inventory='KR/6471-'.repeat(9);
    const accession='P/2026-'.repeat(9);
    render(<PinnedItemIdentity inventoryNumber={inventory} accessionNumber={accession} quantity={0} />);
    const identity=within(screen.getByRole('complementary',{name:'Permanentní identifikace předmětu'}));
    expect(identity.getByText('Inv. č.')).toHaveAttribute('title','Inventární číslo');
    expect(identity.getByText(inventory)).toHaveAttribute('title',inventory);
    expect(identity.getByText(accession)).toHaveAttribute('title',accession);
    expect(identity.getByText('0')).toBeVisible();
});
