// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi,afterEach } from 'vitest';
import PermanentIdentificationHeader from './PermanentIdentificationHeader';

afterEach(()=>{vi.restoreAllMocks();document.getElementById('test-header-geometry')?.remove();});

describe('PermanentIdentificationHeader - CITEM DEMUS Parity', () => {
    it('renders all 6 mandatory identification fields and inventory number', () => {
        render(
            <PermanentIdentificationHeader
                fond="Sbírka výtvarného umění"
                predmet="Obraz"
                titul="Zimní krajina s kostelem"
                autor="Josef Lada"
                datace="1935"
                popis="Olej na plátně, signováno vpravo dole, zachovalý stav."
                inventoryNumber="VU-1045"
            />
        );

        // Ověření přítomnosti inventárního čísla
        expect(screen.getByText('VU-1045')).toBeInTheDocument();

        // Ověření 6 povinných polí CITEM
        expect(screen.getByText('Sbírka výtvarného umění')).toBeInTheDocument();
        expect(screen.getByText('Obraz')).toBeInTheDocument();
        expect(screen.getByText('Zimní krajina s kostelem')).toBeInTheDocument();
        expect(screen.getByText('Josef Lada')).toBeInTheDocument();
        expect(screen.getByText('1935')).toBeInTheDocument();
        expect(screen.getByText(/Olej na plátně/)).toBeInTheDocument();

        // Výchozí režim je Editace
        expect(screen.getByText('Editace')).toBeInTheDocument();
    });

    it('renders correct badges for view mode and new item mode', () => {
        const { rerender } = render(
            <PermanentIdentificationHeader
                titul="Monstrance"
                isViewMode={true}
            />
        );
        expect(screen.getByText('Prohlížení')).toBeInTheDocument();

        rerender(
            <PermanentIdentificationHeader
                titul="Monstrance"
                isNew={true}
            />
        );
        expect(screen.getByText('Nový předmět')).toBeInTheDocument();
    });

    it('renders safe fallback dashes when fields are empty or null', () => {
        render(
            <PermanentIdentificationHeader
                fond={null}
                predmet={undefined}
                titul=""
                autor={null}
                datace=""
                popis="   "
            />
        );

        const dashes = screen.getAllByText('—');
        // Všech 6 polí by mělo mít fallback na pomlčku
        expect(dashes.length).toBe(6);
    });

    it('allows toggling expand/collapse for long descriptions', async () => {
        const css=document.createElement('style');css.id='test-header-geometry';css.textContent='.demus-description dd { max-height:160px; padding:0px; }';document.head.append(css);vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({height:240,width:400,x:0,y:0,top:0,left:0,right:400,bottom:240,toJSON:()=>({})});
        const longDescription = 'Toto je velmi podrobný a dlouhý popis sbírkového předmětu obsahující detailní údaje o provenience, stavu a restaurování v průběhu let.';
        render(
            <PermanentIdentificationHeader
                titul="Historický gobelín"
                popis={longDescription}
            />
        );

        const toggleBtn = screen.getByRole('button', { name: 'Zobrazit celý popis' });
        expect(toggleBtn).toBeInTheDocument();
        expect(screen.queryByText(/Úplný popis předmětu:/i)).not.toBeInTheDocument();

        // Rozbalení popisu
        await userEvent.click(toggleBtn);
        expect(screen.getByRole('button', {name:'Sbalit popis'})).toHaveAttribute('aria-expanded','true');
        expect(screen.getByRole('button', { name: 'Sbalit popis' })).toBeInTheDocument();

        // Sbalení popisu
        await userEvent.click(screen.getByRole('button', { name: 'Sbalit popis' }));
        expect(screen.queryByText(/Úplný popis předmětu:/i)).not.toBeInTheDocument();
    });

    it('applies custom topOffset sticky positioning class', () => {
        const { container } = render(
            <PermanentIdentificationHeader
                titul="Test offset"
                topOffset="top-0"
            />
        );

        const aside = container.querySelector('aside');
        expect(aside).toHaveClass('sticky');
        expect(aside).toHaveClass('top-0');
    });
});

it('does not offer expansion for a description that fits even if longer than50characters',()=>{
 const css=document.createElement('style');css.id='test-header-geometry';css.textContent='.demus-description dd { max-height:160px; padding:0px; }';document.head.append(css);vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({height:36,width:400,x:0,y:0,top:0,left:0,right:400,bottom:36,toJSON:()=>({})});
 render(<PermanentIdentificationHeader popis={'Popis se skutečně vejde. '.repeat(4)}/>);expect(screen.queryByRole('button',{name:'Zobrazit celý popis'})).not.toBeInTheDocument();
});
