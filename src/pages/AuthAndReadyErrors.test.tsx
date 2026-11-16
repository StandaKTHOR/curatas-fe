import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import DataImport from './DataImport';
import ProtectedRoute from '@/components/ProtectedRoute';
import type { ImportApi, ImportStatusResponse } from '@/features/import/types';

const snapshot = (status: ImportStatusResponse['status']): ImportStatusResponse => ({
  id: 'job-1', status, filename: 'data.csv', fileSize: 123, createdAt: '2026-09-09T10:00:00Z',
  updatedAt: '2026-09-09T10:01:00Z', createdBy: 'admin', contentType: 'text/csv', sha256: null,
  totalRecords: 100, validRecords: 90, errorRecords: 10, importedRecords: 80, allowErrors: false, failureReason: null,
  uploadedAt: '2026-09-09T10:00:30Z', validationStartedAt: '2026-09-09T10:00:40Z',
  importStartedAt: '2026-09-09T10:01:10Z', completedAt: '2026-09-09T10:01:20Z',
  processedRecords: null, skippedRecords: null, failedRecords: null,
});

function mockApi(status: ImportStatusResponse['status']) {
  return {
    create: vi.fn().mockResolvedValue({ id: 'job-1', status: 'CREATED' }),
    upload: vi.fn().mockResolvedValue(undefined),
    validate: vi.fn().mockResolvedValue(undefined),
    ready: vi.fn().mockResolvedValue(undefined),
    start: vi.fn().mockResolvedValue(undefined),
    status: vi.fn().mockResolvedValue(snapshot(status)),
    errors: vi.fn().mockResolvedValue({ page: { content: [], currentPage: 0, totalPages: 0, totalElements: 0 } }),
    delete: vi.fn().mockResolvedValue(undefined),
  } satisfies ImportApi;
}

describe('UAT Security and Edge Cases', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('INVALID status -> ready with allowValidationErrors=true when clicking proceed', async () => {
    const api = mockApi('INVALID');
    render(
      <MemoryRouter initialEntries={['/admin/import?importId=job-1']}>
        <DataImport api={api} pollInterval={100000} />
      </MemoryRouter>
    );

    const proceedBtn = await screen.findByRole('button', { name: 'Pokračovat s chybami' });
    await userEvent.click(proceedBtn);

    expect(api.ready).toHaveBeenCalledWith('job-1', { allowValidationErrors: true }, expect.any(AbortSignal));
  });

  it('CURATOR role is blocked from /admin/import and redirected to landing page', async () => {
    const curatorPayload = { roles: ["ROLE_CURATOR"] };
    const curatorToken = "header." + window.btoa(JSON.stringify(curatorPayload)) + ".signature";
    localStorage.setItem('token', curatorToken);

    render(
      <MemoryRouter initialEntries={['/admin/import']}>
        <Routes>
          <Route path="/" element={<div>LANDING_PAGE</div>} />
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin/import" element={<div>IMPORT_PAGE</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('LANDING_PAGE')).toBeInTheDocument();
    expect(screen.queryByText('IMPORT_PAGE')).not.toBeInTheDocument();
  });

  it('ADMIN role is allowed to access /admin/import', async () => {
    const adminPayload = { roles: ["ROLE_ADMIN"] };
    const adminToken = "header." + window.btoa(JSON.stringify(adminPayload)) + ".signature";
    localStorage.setItem('token', adminToken);

    render(
      <MemoryRouter initialEntries={['/admin/import']}>
        <Routes>
          <Route path="/" element={<div>LANDING_PAGE</div>} />
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin/import" element={<div>IMPORT_PAGE</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('IMPORT_PAGE')).toBeInTheDocument();
  });
});
