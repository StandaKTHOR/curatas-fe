import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import DataImport from './DataImport';
import { importTexts as t } from '@/features/import/texts';
import { ImportApiError } from '@/features/import/api';
import type { ImportApi, ImportStatusResponse } from '@/features/import/types';

const snapshot = (status: ImportStatusResponse['status']): ImportStatusResponse => ({
  id: 'job-1', status, filename: 'data.csv', fileSize: 123, createdAt: '2026-09-09T10:00:00Z',
  updatedAt: '2026-09-09T10:01:00Z', createdBy: 'admin', contentType: 'text/csv', sha256: null,
  totalRecords: 100, validRecords: 90, errorRecords: 10, importedRecords: 80, allowErrors: false, failureReason: null,
  uploadedAt: '2026-09-09T10:00:30Z', validationStartedAt: '2026-09-09T10:00:40Z',
  importStartedAt: '2026-09-09T10:01:10Z', completedAt: '2026-09-09T10:01:20Z',
  processedRecords: null, skippedRecords: null, failedRecords: null,
});
function mockApi(status: ImportStatusResponse['status'] = 'UPLOADED') {
  return {
    create: vi.fn().mockResolvedValue({ id: 'job-1', status: 'CREATED' }),
    upload: vi.fn().mockResolvedValue(undefined), validate: vi.fn().mockResolvedValue(undefined),
    ready: vi.fn().mockResolvedValue(undefined), start: vi.fn().mockResolvedValue(undefined),
    status: vi.fn().mockResolvedValue(snapshot(status)),
    errors: vi.fn().mockResolvedValue({ page: { content: [], currentPage: 0, totalPages: 0, totalElements: 0 } }),
    delete: vi.fn().mockResolvedValue(undefined),
  } satisfies ImportApi;
}
function mount(api: ImportApi, resume = true, pollInterval = 100000) {
  return render(<MemoryRouter initialEntries={[resume ? '/admin/import?importId=job-1' : '/admin/import']}>
    <DataImport api={api} pollInterval={pollInterval} />
  </MemoryRouter>);
}

describe('Import dat', () => {
  it('shows empty state, file metadata and upload loading; resumes using server ID', async () => {
    const api = mockApi();
    let finish!: () => void;
    api.upload.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    mount(api, false);
    expect(screen.getByText(t.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.upload })).toBeDisabled();
    const file = new File(['test'], 'data.csv');
    await userEvent.upload(screen.getByLabelText(t.select), file);
    await userEvent.click(screen.getByRole('button', { name: t.upload }));
    expect(screen.getByText(t.uploading)).toBeInTheDocument();
    expect(api.upload).toHaveBeenCalledWith('job-1', file, expect.any(AbortSignal));
    await act(async () => finish());
    expect(await screen.findByRole('button', { name: t.validate })).toBeEnabled();
  });

  it('validates asynchronously and polls until valid', async () => {
    const api = mockApi();
    api.validate.mockImplementation(async () => {
      api.status.mockResolvedValueOnce(snapshot('VALIDATING')).mockResolvedValue(snapshot('VALID'));
    });
    mount(api, true, 15);
    await userEvent.click(await screen.findByRole('button', { name: t.validate }));
    expect(await screen.findByRole('button', { name: t.start })).toBeEnabled();
    expect(api.validate).toHaveBeenCalledTimes(1);
    expect(api.status.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('shows validation failure, paginates errors on server and accepts a corrected file', async () => {
    const api = mockApi('INVALID');
    api.errors.mockImplementation(async (_id, page) => ({ page: {
      content: [{ id: page + 1, sourceTable: null, row: page + 2, field: 'title', value: '<script>', reason: `Problem ${page}`, severity: 'ERROR' }],
      currentPage: page, totalPages: 2, totalElements: 51,
    } }));
    mount(api);
    expect(await screen.findByText(t.validationFailed)).toBeInTheDocument();
    expect(await screen.findByText('Problem 0')).toBeInTheDocument();
    expect(screen.getByText('<script>')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.start })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t.next }));
    expect(await screen.findByText('Problem 1')).toBeInTheDocument();
    expect(api.errors).toHaveBeenLastCalledWith('job-1', 1, 50, expect.any(AbortSignal));
    await userEvent.click(screen.getByRole('button', { name: t.replace }));
    expect(await screen.findByLabelText(t.select)).toBeEnabled();
    expect(screen.queryByText('Problem 1')).not.toBeInTheDocument();
    await userEvent.upload(screen.getByLabelText(t.select), new File(['fixed'], 'fixed.csv'));
    await userEvent.click(screen.getByRole('button', { name: t.upload }));
    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
  });

  it('starts once, displays progress and final statistics, then stops polling', async () => {
    const api = mockApi('VALID');
    api.start.mockImplementation(async () => {
      api.status.mockResolvedValueOnce(snapshot('IMPORTING')).mockResolvedValue(snapshot('COMPLETED'));
    });
    mount(api, true, 30);
    await userEvent.click(await screen.findByRole('button', { name: t.start }));
    expect(await screen.findByRole('progressbar', { name: t.status.IMPORTING })).toBeInTheDocument();
    const completed = await screen.findByRole('region', { name: t.completed });
    expect(within(completed).getByText('80')).toBeInTheDocument();
    expect(within(completed).getAllByText(t.unavailableValue)).toHaveLength(2);
    expect(api.ready).toHaveBeenCalledWith('job-1', { allowValidationErrors: false }, expect.any(AbortSignal));
    expect(api.start).toHaveBeenCalledTimes(1);
    const count = api.status.mock.calls.length;
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 80)); });
    expect(api.status).toHaveBeenCalledTimes(count);
  });

  it.each([new ImportApiError(503), new TypeError('offline')])('recovers from server unavailability with a GET', async error => {
    const api = mockApi('IMPORTING');
    api.status.mockRejectedValueOnce(error);
    mount(api);
    expect(await screen.findByText(t.serverUnavailable)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t.retry }));
    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(api.start).not.toHaveBeenCalled();
  });

  it.each([[401, t.unauthorized], [400, t.requestFailed]])('shows HTTP %s error', async (code, message) => {
    const api = mockApi();
    api.status.mockRejectedValue(new ImportApiError(code as number));
    mount(api);
    expect(await screen.findByRole('alert')).toHaveTextContent(message as string);
  });

  it('shows backend failure and error list retry', async () => {
    const api = mockApi('FAILED');
    api.status.mockResolvedValue({ ...snapshot('FAILED'), failureReason: 'Storage failure' });
    api.errors.mockRejectedValueOnce(new Error('error page failed'));
    mount(api);
    expect(await screen.findByText('Storage failure')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: t.retryErrors }));
    expect(await screen.findByText(t.noErrors)).toBeInTheDocument();
  });

  it('aborts status requests on unmount and ignores late results', async () => {
    const api = mockApi('VALIDATING');
    api.status.mockImplementation(() => new Promise(() => {}));
    const view = mount(api);
    expect(screen.getByText(t.loading)).toBeInTheDocument();
    const signal = api.status.mock.calls[0][1];
    view.unmount();
    expect(signal.aborted).toBe(true);
  });

  it('keeps start disabled while an accepted command has not changed server state', async () => {
    const api = mockApi('VALID');
    mount(api, true, 15);
    await userEvent.click(await screen.findByRole('button', { name: t.start }));
    await waitFor(() => expect(api.status.mock.calls.length).toBeGreaterThan(2));
    expect(screen.getByRole('button', { name: t.start })).toBeDisabled();
    expect(api.start).toHaveBeenCalledTimes(1);
    api.status.mockResolvedValue(snapshot('COMPLETED_WITH_ERRORS'));
    expect(await screen.findByRole('region', { name: t.completed })).toBeInTheDocument();
    expect(screen.getByText(t.status.COMPLETED_WITH_ERRORS)).toBeInTheDocument();
  });

  it('reconciles a failed start before allowing another command', async () => {
    const api = mockApi('VALID');
    api.start.mockRejectedValue(new ImportApiError(503));
    mount(api);
    await userEvent.click(await screen.findByRole('button', { name: t.start }));
    expect(await screen.findByText(t.serverUnavailable)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.start })).toBeDisabled();
    api.status.mockResolvedValue(snapshot('IMPORTING'));
    await userEvent.click(screen.getByRole('button', { name: t.retry }));
    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(api.start).toHaveBeenCalledTimes(1);
  });

  it('retains upload errors and reconciles the created job without creating another', async () => {
    const api = mockApi('CREATED');
    api.upload.mockRejectedValueOnce(new ImportApiError(503));
    mount(api, false);
    await userEvent.upload(screen.getByLabelText(t.select), new File(['a'], 'data.csv'));
    await userEvent.click(screen.getByRole('button', { name: t.upload }));
    expect(await screen.findByText(t.serverUnavailable)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t.retry }));
    await userEvent.upload(screen.getByLabelText(t.select), new File(['a'], 'data.csv'));
    await userEvent.click(screen.getByRole('button', { name: t.upload }));
    await waitFor(() => expect(api.upload).toHaveBeenCalledTimes(2));
    expect(api.create).toHaveBeenCalledTimes(1);
  });
});
