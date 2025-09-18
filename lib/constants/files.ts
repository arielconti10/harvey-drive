export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const ALLOWED_FILE_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/gif",
];

export const ALLOWED_FILE_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "jpg",
  "jpeg",
  "png",
  "gif",
];

export const ACCEPT_FILE_TYPES_ATTRIBUTE = ALLOWED_FILE_EXTENSIONS.map((ext) => `.${ext}`).join(",");

export function isAllowedFileType(mimeType: string | undefined, fileName: string): boolean {
  if (!mimeType && !fileName) return false;
  if (mimeType && ALLOWED_FILE_MIME_TYPES.includes(mimeType)) {
    return true;
  }
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_FILE_EXTENSIONS.includes(extension);
}
