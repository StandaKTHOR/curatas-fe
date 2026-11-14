import {expect,it} from 'vitest';
import {catalogHeaderRole} from './catalogPresentation';
it.each([{roles:['ADMIN']},{roles:['ROLE_ADMIN']}])('retains global-admin display for $roles',({roles})=>expect(catalogHeaderRole(roles,[])).toBe('Administrátor'));
it('uses catalog administration capability when local-access JWT has no global roles',()=>{const roles:string[]=[];const caps=['catalog.read','catalog.grant.manage'];expect(catalogHeaderRole(roles,caps)).toBe('Administrátor');expect(roles).toEqual([]);expect(caps).toEqual(['catalog.read','catalog.grant.manage']);});
it.each([{caps:[]},{caps:['item.write']},{caps:['catalog.audit.read']},{caps:['catalog.access.delegate']}])('does not invent administration from $caps',({caps})=>expect(catalogHeaderRole([],caps)).toBe('Kurátor'));
