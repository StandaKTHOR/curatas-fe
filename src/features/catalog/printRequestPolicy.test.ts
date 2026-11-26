import {it,expect,vi} from 'vitest';import {approveFullPrint} from './printRequestPolicy';
it.each([0,1,50,1000])('allows bounded print %s without a warning',count=>{const confirm=vi.fn();expect(approveFullPrint(count,confirm)).toBe(true);expect(confirm).not.toHaveBeenCalled();});
it('warns before loading8155 and supports cancellation',()=>{const confirm=vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);expect(approveFullPrint(8155,confirm)).toBe(false);expect(approveFullPrint(8155,confirm)).toBe(true);expect(confirm.mock.calls[0][0]).toContain('desítky sekund');});
it('retains server10000 bound and rejects unknown counts',()=>{expect(approveFullPrint(10000,()=>true)).toBe(true);for(const value of [10001,NaN,-1,1.5])expect(()=>approveFullPrint(value,vi.fn())).toThrow();});
