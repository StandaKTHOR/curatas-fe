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
    it.each([['Textil starý','TEXTIL_STARY'],['Textil nový','TEXTIL_NOVY']])('keeps generating a distinct child code through spaces and Czech characters: %s',async(label,code)=>{
        const create=vi.fn().mockResolvedValue(undefined),parent='00000000-0000-4000-8000-000000000001';
        const {container}=render(<AddDictionaryModal isOpen dictionaryType="MATERIAL" dictionaryTitle="Materiál" onClose={vi.fn()} onSuccess={vi.fn()} onCreate={create} parentOptions={[{id:parent,label:'Textil — kód: TEXTIL — UUID rodiče: '+parent}]}/>);
        await userEvent.type(container.querySelector('#dictLabel')!,label);expect(container.querySelector('#dictCode')).toHaveValue(code);
        await userEvent.selectOptions(screen.getByLabelText('Nadřazená položka'),parent);await userEvent.click(screen.getByRole('button',{name:'Přidat a vybrat'}));
        await waitFor(()=>expect(create).toHaveBeenCalledWith({type:'MATERIAL',label,code,parentId:parent}));
    });
    it('preserves an explicit code when the label changes and when editing an existing authority',async()=>{
        const {container}=render(<AddDictionaryModal isOpen dictionaryType="MATERIAL" dictionaryTitle="Materiál" editing initialValue={{label:'Textil',code:'CURATOR_CODE',parentId:null}} onClose={vi.fn()} onSuccess={vi.fn()} onCreate={vi.fn()}/>);
        await userEvent.type(container.querySelector('#dictLabel')!,' starý');expect(container.querySelector('#dictCode')).toHaveValue('CURATOR_CODE');
        await userEvent.clear(container.querySelector('#dictCode')!);await userEvent.type(container.querySelector('#dictCode')!,'EXPLICIT');await userEvent.type(container.querySelector('#dictLabel')!,' nový');expect(container.querySelector('#dictCode')).toHaveValue('EXPLICIT');
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
            expect(handleSuccess).toHaveBeenCalledWith(expect.objectContaining({
                code: 'FRANCIE',
                label: 'Francie',
                type: 'COUNTRY',
                id: 101
            }));
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
