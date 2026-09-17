import { useEffect, useState } from 'react';
import { GovButton } from '@gov-design-system-ce/react';
import { importApi } from '@/features/import/api';
import { importTexts as t } from '@/features/import/texts';
import type { ImportApi, ImportErrorPage } from '@/features/import/types';
import { useImport } from '@/features/import/useImport';

function Errors({ id, api }: { id: string; api: ImportApi }) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<ImportErrorPage | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(false);
    api.errors(id, page, 50, controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [id, page, api, retry]);

  return (
    <section aria-label={t.errors} className="space-y-4 pt-6 border-t border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <span className="w-2.5 h-2.5 bg-red-600 rounded-full"></span>
        {t.errors}
      </h2>
      {error ? (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex justify-between items-center">
          <span>{t.errorsFailed}</span>
          <GovButton type="outlined" color="primary" size="s" onClick={() => setRetry(n => n + 1)}>
            {t.retryErrors}
          </GovButton>
        </div>
      ) : !data ? (
        <p role="status" className="text-gray-500 animate-pulse">{t.loading}</p>
      ) : (
        <>
          <p className="text-sm font-semibold text-gray-700">{t.errorCount(data.page.totalElements)}</p>
          {data.page.content.length === 0 ? (
            <p className="text-gray-500 bg-gray-50 p-4 rounded border text-center">{t.noErrors}</p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-md shadow-sm">
              <table className="w-full text-left border-collapse bg-white">
                <caption className="sr-only">{t.errors}</caption>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <th scope="col" className="p-3 border-r border-gray-200">{t.table}</th>
                    <th scope="col" className="p-3 border-r border-gray-200">{t.row}</th>
                    <th scope="col" className="p-3 border-r border-gray-200">{t.field}</th>
                    <th scope="col" className="p-3 border-r border-gray-200">{t.value}</th>
                    <th scope="col" className="p-3 border-r border-gray-200">{t.reason}</th>
                    <th scope="col" className="p-3">{t.severity}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {data.page.content.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-900 border-r border-gray-200 break-all">{e.sourceTable ?? t.unavailableValue}</td>
                      <td className="p-3 text-gray-500 border-r border-gray-200">{e.row ?? t.unavailableValue}</td>
                      <td className="p-3 text-gray-500 border-r border-gray-200 break-all">{e.field ?? t.unavailableValue}</td>
                      <td className="p-3 text-gray-500 border-r border-gray-200 break-all">{e.value ?? t.unavailableValue}</td>
                      <td className="p-3 text-red-600 font-medium border-r border-gray-200 break-all">{e.reason}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          e.severity === 'ERROR' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {e.severity ?? 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      <nav aria-label={t.errors} className="flex items-center justify-between gap-3 pt-4">
        <GovButton type="outlined" color="neutral" size="s" disabled={page === 0 || (!data && !error)} onClick={() => setPage(n => n - 1)}>
          {t.previous}
        </GovButton>
        {data && <span className="text-sm text-gray-600 font-medium">{t.page(data.page.currentPage + 1, Math.max(1, data.page.totalPages))}</span>}
        <GovButton type="outlined" color="neutral" size="s" disabled={!data || page + 1 >= data.page.totalPages} onClick={() => setPage(n => n + 1)}>
          {t.next}
        </GovButton>
      </nav>
    </section>
  );
}

function Stats({ items }: { items: [string, string | number][] }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        {items.map(([label, value]) => (
          <div key={label} className="flex justify-between md:flex-col md:justify-start py-2 border-b border-gray-100 md:border-b-0">
            <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</dt>
            <dd className="text-sm font-semibold text-gray-900 mt-1">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function DataImport({ api = importApi, pollInterval = 2000 }: { api?: ImportApi; pollInterval?: number }) {
  const flow = useImport(api, pollInterval);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => { setFile(null); }, [flow.id]);

  const data = flow.data;
  const done = data?.status === 'COMPLETED' || data?.status === 'COMPLETED_WITH_ERRORS';
  const canSelect = !flow.id || data?.status === 'CREATED';
  const showErrors = data && ['VALID', 'INVALID', 'READY', 'FAILED', 'COMPLETED', 'COMPLETED_WITH_ERRORS'].includes(data.status);

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md border border-gray-200 space-y-8">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{t.title}</h1>
        <p className="text-sm text-gray-500 mt-1">Administrátorské rozhraní pro import a validaci databázových souborů MDB/ACCDB.</p>
      </div>

      {canSelect && (
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (file) void flow.upload(file); }}>
          <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider" htmlFor="import-file">
            {t.select}
          </label>
          <div className="flex items-center justify-center w-full">
            <label htmlFor="import-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <span className="text-3xl mb-2">📁</span>
                <p className="mb-2 text-sm text-gray-500 font-semibold">{file ? file.name : 'Přetáhněte sem soubor nebo klikněte a vyberte'}</p>
                <p className="text-xs text-gray-400">Podporované formáty: MDB, ACCDB</p>
              </div>
              <input id="import-file" type="file" disabled={flow.busy} onChange={e => setFile(e.target.files?.[0] ?? null)} className="hidden" />
            </label>
          </div>
          {file ? (
            <Stats items={[[t.filename, file.name], [t.size, `${file.size.toLocaleString(t.locale)} ${t.bytes}`]]} />
          ) : (
            <p className="text-sm text-gray-500 text-center italic">{t.empty}</p>
          )}
          <div className="flex justify-end pt-2">
            <button
                type="submit"
                disabled={!file || flow.busy || flow.checking || !!flow.error}
                className="px-6 py-3 rounded-md bg-[#ffb511] text-gray-900 font-bold disabled:opacity-50 disabled:cursor-not-allowed">
              {t.upload}
            </button>
          </div>
        </form>
      )}

      {flow.busy && (
        <div role="status" className="flex flex-col items-center justify-center p-6 bg-blue-50 border border-blue-100 rounded-lg space-y-3">
          <p className="text-sm font-bold text-blue-700 animate-pulse">{canSelect ? t.uploading : t.loading}</p>
          <div role="progressbar" aria-label={canSelect ? t.uploading : t.loading} className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
            <div className="bg-blue-600 h-2 rounded-full animate-indeterminate"></div>
          </div>
        </div>
      )}

      {flow.error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-sm font-semibold">{flow.error}</p>
          <GovButton type="solid" color="error" size="s" onClick={flow.retry}>
            {t.retry}
          </GovButton>
        </div>
      )}

      {flow.id && !data && !flow.error && !flow.busy && (
        <div className="flex justify-center p-8">
          <p role="status" className="text-gray-500 animate-pulse flex items-center gap-2">
            <span className="text-lg animate-spin">⏳</span> {t.loading}
          </p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <section aria-label={t.file} className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900">{t.file}</h2>
            <Stats items={[
              [t.filename, data.filename ?? t.unavailableValue],
              [t.size, data.fileSize === null ? t.unavailableValue : `${data.fileSize.toLocaleString(t.locale)} ${t.bytes}`],
              ['SHA-256', data.sha256 ?? t.unavailableValue],
              [t.createdAt, new Date(data.createdAt).toLocaleString(t.locale)],
              [t.uploadedAt, data.updatedAt ? new Date(data.updatedAt).toLocaleString(t.locale) : t.unavailableValue]
            ]} />
            <p className="text-xs text-gray-400 italic">{t.uploadDateNote}</p>
          </section>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg gap-4">
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Stav importu</span>
              <span role="status" aria-live="polite" className="text-sm font-semibold text-gray-900 mt-1 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  data.status === 'COMPLETED' ? 'bg-green-500' :
                  data.status === 'COMPLETED_WITH_ERRORS' ? 'bg-yellow-500' :
                  data.status === 'FAILED' ? 'bg-red-500' :
                  'bg-blue-500'
                }`}></span>
                {t.status[data.status]}
              </span>
            </div>
            {(data.status === 'VALIDATING' || data.status === 'IMPORTING') && (
              <div role="progressbar" aria-label={t.status[data.status]} className="w-full md:w-48 bg-blue-100 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-600 h-2 rounded-full animate-indeterminate"></div>
              </div>
            )}
          </div>

          {data.status !== 'CREATED' && data.status !== 'UPLOADED' && (
            <section aria-label={t.validation} className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900">{t.validation}</h2>
              <Stats items={[
                [t.totalRecords, data.totalRecords],
                [t.valid, data.validRecords],
                [t.invalid, data.errorRecords]
              ]} />
            </section>
          )}

          {data.status === 'INVALID' && (
            <div className="space-y-4">
              <div role="alert" className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium text-sm flex items-center gap-2">
                <span>⚠️</span>
                <span>{t.validationFailed}</span>
              </div>
              <div className="flex justify-end">
                <GovButton disabled={flow.busy || flow.checking || !!flow.error} onClick={() => flow.start(true)} type="solid" color="primary">
                  Pokračovat s chybami
                </GovButton>
              </div>
            </div>
          )}

          {data.status === 'FAILED' && (
            <div role="alert" className="p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg font-medium text-sm flex items-center gap-2">
              <span>❌</span>
              <span>{data.failureReason || t.status.FAILED}</span>
            </div>
          )}

          {data.status === 'UPLOADED' && (
              <div className="flex justify-end">
                <button
                    type="button"
                    disabled={flow.busy || flow.checking || !!flow.error}
                    onClick={flow.validate}
                    className="px-6 py-3 rounded-md bg-[#ffb511] text-gray-900 font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                  {t.validate}
                </button>
              </div>
          )}

          {(data.status === 'VALID' || data.status === 'READY') && (
              <div className="flex justify-end">
                <button
                    type="button"
                    disabled={flow.busy || flow.checking || !!flow.error}
                    onClick={() => flow.start()}
                    className="px-6 py-3 rounded-md bg-[#ffb511] text-gray-900 font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                  {t.start}
                </button>
              </div>
          )}

          {(data.status === 'IMPORTING' || done || data.status === 'FAILED') && (
            <section aria-label={t.importing} className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900">{t.importing}</h2>
              <Stats items={[
                [t.processed, data.processedRecords ?? t.unavailableValue],
                [t.successful, data.importedRecords ?? t.unavailableValue],
                [t.failed, data.failedRecords ?? t.unavailableValue]
              ]} />
              <p className="text-xs text-gray-400 italic">{t.missingStatistics}</p>
            </section>
          )}

          {done && (
            <section aria-label={t.completed} className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900">{t.completed}</h2>
              <Stats items={[
                [t.total, data.totalRecords ?? t.unavailableValue],
                [t.imported, data.importedRecords ?? t.unavailableValue],
                [t.skipped, data.skippedRecords ?? t.unavailableValue],
                [t.failedFinal, data.failedRecords ?? t.unavailableValue]
              ]} />
            </section>
          )}

          {showErrors && <Errors key={`${data.id}-${data.status}`} id={data.id} api={api} />}

          {(['INVALID', 'FAILED', 'VALID', 'UPLOADED'].includes(data.status) || done) && (
            <div className="flex justify-end pt-4 border-t border-gray-100">
              <GovButton disabled={flow.busy} onClick={flow.reset} type="outlined" color="primary">
                {done ? t.newImport : t.replace}
              </GovButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
