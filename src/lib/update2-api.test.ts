import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getAdminItem, updateItem, patchMuseumItem, updateMuseumRecord,
    createMuseumRecord, deleteMuseumRecord, updateMuseumAcquisition, uploadAttachment, downloadAttachmentFile,
    getAttachmentCount, patchAttachment, listAdminItems } from './api';
import type { ItemEditSession } from './editSession';

const fetchMock = vi.fn();
const reply = (body: unknown, status = 200, tag?: string) => new Response(status === 204 ? null : JSON.stringify(body), {
    status, headers: {'Content-Type': 'application/json', ...(tag ? {ETag: tag} : {})},
});
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); localStorage.setItem('token', 'test-token'); });
afterEach(() => {vi.unstubAllGlobals(); localStorage.clear();});
const session = (): ItemEditSession => ({itemId: 7, etag: '"3"'});

describe('Update2 snapshot and optimistic writes', () => {
    it('accepts only a consistent version/detail/museum/version snapshot', async () => {
        fetchMock.mockResolvedValueOnce(reply({rowVersion: 3},200,'"3"'))
            .mockResolvedValueOnce(reply({id:7,description:'snapshot'}))
            .mockResolvedValueOnce(reply({itemId:7,records:[]},200,'"3"'))
            .mockResolvedValueOnce(reply({rowVersion:3},200,'"3"'));
        const item = await getAdminItem('7');
        expect(item._editSession.etag).toBe('"3"');
        expect(JSON.stringify(item)).not.toContain('_editSession');
        expect(fetchMock.mock.calls.map(([path]) => String(path).split('/').pop())).toEqual(['version','7','museum','version']);
    });
    it('rejects a snapshot changed during reading', async () => {
        fetchMock.mockResolvedValueOnce(reply({},200,'"3"')).mockResolvedValueOnce(reply({id:7}))
            .mockResolvedValueOnce(reply({},200,'"3"')).mockResolvedValueOnce(reply({},200,'"4"'));
        await expect(getAdminItem('7')).rejects.toMatchObject({status:412});
    });
    it('chains exact opaque ETags through item, museum, origin and acquisition PATCH', async () => {
        const editor = session();
        fetchMock.mockResolvedValueOnce(reply({},200,'"4"')).mockResolvedValueOnce(reply({},200,'"6"'))
            .mockResolvedValueOnce(reply({},200,'"8"')).mockResolvedValueOnce(reply({},200,'"9"'));
        await updateItem(7,{description:'reviewed'},editor);
        await patchMuseumItem(7,{originNote:null},editor);
        await updateMuseumRecord(7,'ORIGIN',12,{MistoVz_VZ:'Brno'},null,null,editor);
        await updateMuseumAcquisition(7,13,{acquiredFrom:null} as never,editor);
        expect(fetchMock.mock.calls.map(([,init]) => init.headers['If-Match'])).toEqual(['"3"','"4"','"6"','"8"']);
        expect(fetchMock.mock.calls.every(([,init]) => init.method === 'PATCH')).toBe(true);
        expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({acquiredFrom:null});
        expect(editor.etag).toBe('"9"');
    });
    it('guards record creation and deletion with the same aggregate version', async () => {
        const editor=session();
        fetchMock.mockResolvedValueOnce(reply({id:10},201,'"4"')).mockResolvedValueOnce(reply(null,204,'"5"'));
        await createMuseumRecord(7,'DOCUMENTATION',{Dokument_DK:'file'},null,null,editor);
        await deleteMuseumRecord(7,'DOCUMENTATION',10,editor);
        expect(fetchMock.mock.calls[1][1].headers['If-Match']).toBe('"4"');
    });
    it.each([400,401,403,404,409,412,428])('surfaces HTTP %s without retry or success', async status => {
        const editor=session();
        fetchMock.mockResolvedValue(reply({message:'rejected',fieldErrors:[{field:'title',message:'invalid'}]},status));
        await expect(updateItem(7,{title:'unsaved'},editor)).rejects.toMatchObject({status,fieldErrors:{title:'invalid'}});
        expect(editor.etag).toBe('"3"'); expect(editor.busy).toBe(false); expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    it('does not share tokens between two editors of the same item', async () => {
        const first=session(), second=session();
        fetchMock.mockResolvedValueOnce(reply({},200,'"4"')).mockResolvedValueOnce(reply({},412));
        await updateItem(7,{title:'first'},first);
        await expect(updateItem(7,{title:'second'},second)).rejects.toBeInstanceOf(ApiError);
        expect(fetchMock.mock.calls[1][1].headers['If-Match']).toBe('"3"');
    });
    it('blocks writes without a snapshot or while another section is writing', async () => {
        await expect(updateItem(7,{})).rejects.toThrow(/Chybí verze/);
        await expect(updateItem(7,{}, {...session(),busy:true})).rejects.toThrow(/Probíhá ukládání/);
        expect(fetchMock).not.toHaveBeenCalled();
    });
    it('does not reuse a token after a successful response missing ETag', async () => {
        const editor=session(); fetchMock.mockResolvedValue(reply({}));
        await updateItem(7,{},editor);
        await expect(patchMuseumItem(7,{},editor)).rejects.toThrow(/Chybí verze/);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});

describe('Update2 media contracts', () => {
    it('reads persisted counts and edits attachment caption through the media contract', async () => {
        fetchMock.mockResolvedValueOnce(reply({count:2})).mockResolvedValueOnce(reply({id:8,caption:'reviewed'}));
        expect(await getAttachmentCount(7)).toBe(2);
        await patchAttachment(7,8,{caption:'reviewed'});
        expect(fetchMock.mock.calls[1][1].method).toBe('PATCH');
        expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({caption:'reviewed'});
        expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer test-token');
        expect(fetchMock.mock.calls[1][1].headers).not.toHaveProperty('If-Match');
    });
    it('uploads multipart primary with bearer authentication and reports errors', async () => {
        fetchMock.mockResolvedValueOnce(reply({id:8})).mockResolvedValueOnce(reply({message:'denied'},403));
        await uploadAttachment(7,new File(['x'],'test.txt'),'caption',true);
        const options=fetchMock.mock.calls[0][1];
        expect(options.body.get('primary')).toBe('true'); expect(options.body.has('isPrimary')).toBe(false);
        expect(options.headers.Authorization).toBe('Bearer test-token');
        await expect(uploadAttachment(7,new File(['x'],'test.txt'))).rejects.toThrow('denied');
    });
    it('fetches protected attachments using JWT and rejects failed downloads', async () => {
        fetchMock.mockResolvedValue(reply({},403));
        await expect(downloadAttachmentFile(7,8,'test.txt')).rejects.toThrow(/Stažení/);
        expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token');
    });
});

it('sends combined catalogue predicates to server paging rather than filtering a fetched page', async () => {
    fetchMock.mockResolvedValue(reply({content:[],totalElements:0}));
    await listAdminItems({inventoryNumber:'TEST',material:'kov',subCollection:'1',page:2,size:50,
        advancedFilter:JSON.stringify({conjunction:'AND',conditions:[{field:'legacyCreatedBy',operator:'EQUALS',value:'TEST'}]})} as never);
    const url=new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('material')).toBe('kov');
    expect(JSON.parse(url.searchParams.get('advancedFilter')!).conditions[0].field).toBe('legacyCreatedBy');
});
