import {render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import Fields from './DictionaryProfessionalFields';
it('preserves recorded precision and invalid professional data without showing service keys',()=>{
 const fields={DatNar_OS:{kind:'TEXT',value:'nesprávně 1900??'},Medailon_OS:{kind:'TEXT',value:'Doložený medailon\ndruhý řádek'},Sluz_OS:{kind:'TEXT',value:'SERVISNI_DATA'},recordId:'a'.repeat(64)};const before=JSON.stringify(fields);
 const {container}=render(<Fields type="AUTHOR" fields={fields}/>);expect(screen.getByText('nesprávně 1900??')).toBeVisible();expect(screen.getByText(/Doložený medailon/)).toBeVisible();expect(container.textContent).not.toMatch(/Sluz_OS|SERVISNI|[a-f0-9]{64}|DEMUS|JSON/);expect(JSON.stringify(fields)).toBe(before);
});
it('keeps bibliographic descriptions and the exact original unit accessible',()=>{
 const {rerender}=render(<Fields type="LITERATURE" fields={{Titul_LT:{value:'Odborná publikace'},Anotace_LT:{value:'Doložený popis'},ISBN_LT:{value:'978 test'}}}/>);expect(screen.getByText('Doložený popis')).toBeVisible();expect(screen.getByText('978 test')).toBeVisible();rerender(<Fields type="DIMENSION" fields={{Jedn_RZ:{value:'cm'},Slovy_RZ:{value:'Průměr'}}}/>);expect(screen.getByText('Jednotka')).toBeVisible();expect(screen.getByText('cm')).toBeVisible();expect(screen.getByText('Průměr')).toBeVisible();
});
