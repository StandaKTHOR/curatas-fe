// Mirrors curatas-be-fat: imports/ImportDtos.java, ImportStatus.java and dto/PageDto.java.
export type ImportStatus = 'CREATED' | 'UPLOADED' | 'VALIDATING' | 'VALID' | 'INVALID'
  | 'READY' | 'IMPORTING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';

export interface ImportCreateResponse { id: string; status: ImportStatus }
export interface ImportSummary extends ImportCreateResponse {
  createdAt: string; createdBy: string; filename: string | null; fileSize: number | null;
  totalRecords: number; validRecords: number; errorRecords: number; importedRecords: number;
}
export interface ImportStatusResponse extends ImportSummary {
  uploadedAt: string | null;
  updatedAt: string;
  validationStartedAt: string | null;
  importStartedAt: string | null;
  completedAt: string | null;
  processedRecords: number | null;
  skippedRecords: number | null;
  failedRecords: number | null;
  contentType: string | null;
  sha256: string | null;
  allowErrors: boolean;
  failureReason: string | null;
}
export interface ReadyRequest { allowValidationErrors: boolean }
export interface ImportValidationError {
  id: number; sourceTable: string | null; row: number | null; field: string | null;
  value: string | null; reason: string; severity: string;
}
export interface PageDto<T> { content: T[]; totalPages: number; totalElements: number; currentPage: number }
export interface ImportErrorPage { page: PageDto<ImportValidationError> }

export interface ImportApi {
  create(signal: AbortSignal): Promise<ImportCreateResponse>;
  upload(id: string, file: File, signal: AbortSignal): Promise<void>;
  validate(id: string, signal: AbortSignal): Promise<void>;
  ready(id: string, request: ReadyRequest, signal: AbortSignal): Promise<void>;
  start(id: string, signal: AbortSignal): Promise<void>;
  status(id: string, signal: AbortSignal): Promise<ImportStatusResponse>;
  errors(id: string, page: number, size: number, signal: AbortSignal): Promise<ImportErrorPage>;
  delete(id: string, signal: AbortSignal): Promise<void>;
}
