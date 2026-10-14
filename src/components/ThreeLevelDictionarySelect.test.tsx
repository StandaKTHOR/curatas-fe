import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { useState } from 'react';
import ThreeLevelDictionarySelect, { invalidateHierarchy } from './ThreeLevelDictionarySelect';
import { getDictionaryTree } from '../lib/api';
vi.mock('../lib/api', () => ({ getDictionaryTree: vi.fn() }));
const tree = [
    { id: 1, code: null, label: 'Test root A', children: [{ id: 2, code: null, label: 'Test middle', children: [
        { id: 3, code: 'TEST', label: 'Test leaf', children: [] }] }] },
    { id: 4, code: null, label: 'Test root B', children: [] },
];
beforeEach(() => { vi.resetAllMocks(); invalidateHierarchy(); vi.mocked(getDictionaryTree).mockResolvedValue(tree); });
function Editor({ initial = 3 }: { initial?: number | null }) {
    const [id, setId] = useState<number | null>(initial);
    return <><ThreeLevelDictionarySelect type="MATERIAL" label="Materiál" value={id} historicalValue="Neznámý původní text" onChange={setId}/>
        <output aria-label="Saved ID">{id ?? 'null'}</output></>;
}
it('loads all three levels from the backend without mutating the historical text or emitting a write', async () => {
    const onChange = vi.fn();
    render(<ThreeLevelDictionarySelect type="MATERIAL" label="Materiál" value={3} historicalValue="Neznámý původní text" onChange={onChange}/>);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Materiál — úroveň 3' })).toHaveValue('3'));
    expect(screen.getByRole('combobox', { name: 'Materiál — úroveň 1' })).toHaveValue('1');
    expect(screen.getByRole('combobox', { name: 'Materiál — úroveň 2' })).toHaveValue('2');
    expect(screen.getByText(/Neznámý původní text/)).toBeInTheDocument(); expect(onChange).not.toHaveBeenCalled();
});
it('filters children and resets both descendants when the parent changes', async () => {
    render(<Editor/>);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Materiál — úroveň 3' })).toHaveValue('3'));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Materiál — úroveň 1' }), '4');
    expect(screen.getByLabelText('Saved ID')).toHaveTextContent('4');
    expect(screen.getByRole('combobox', { name: 'Materiál — úroveň 2' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Materiál — úroveň 3' })).toHaveValue('');
    expect(screen.queryByRole('option', { name: 'Test middle' })).not.toBeInTheDocument();
});
it('permits a path to be selected and explicitly cleared', async () => {
    render(<Editor initial={null}/>);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Materiál — úroveň 1' })).toBeEnabled());
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Materiál — úroveň 1' }), '1');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Materiál — úroveň 2' }), '2');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Materiál — úroveň 3' }), '3');
    expect(screen.getByLabelText('Saved ID')).toHaveTextContent('3');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Materiál — úroveň 1' }), '');
    expect(screen.getByLabelText('Saved ID')).toHaveTextContent('null');
    expect(screen.getByText(/Neznámý původní text/)).toBeInTheDocument();
});
it('preserves an unavailable historical ID and follows the next item without carrying the path', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<ThreeLevelDictionarySelect type="MATERIAL" label="Materiál" value={99} onChange={onChange}/>);
    await screen.findByText(/Stávající vazba #99/);
    expect(onChange).not.toHaveBeenCalled();
    rerender(<ThreeLevelDictionarySelect type="MATERIAL" label="Materiál" value={4} onChange={onChange}/>);
    expect(screen.getByRole('combobox', { name: 'Materiál — úroveň 1' })).toHaveValue('4');
    expect(screen.getByRole('combobox', { name: 'Materiál — úroveň 2' })).toHaveValue('');
    expect(onChange).not.toHaveBeenCalled();
});
it('keeps slow/error requests read-only and allows an explicit retry', async () => {
    vi.mocked(getDictionaryTree).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(tree);
    render(<Editor/>);
    await screen.findByRole('alert');
    expect(screen.getByRole('combobox', { name: 'Materiál — úroveň 1' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Zkusit znovu' }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Materiál — úroveň 3' })).toHaveValue('3'));
    expect(getDictionaryTree).toHaveBeenCalledTimes(2);
});
it('shares a single request between two mounted selectors', async () => {
    render(<><Editor/><Editor/></>);
    await waitFor(() => expect(screen.queryByText('Načítání číselníku…')).not.toBeInTheDocument());
    expect(getDictionaryTree).toHaveBeenCalledTimes(1);
});