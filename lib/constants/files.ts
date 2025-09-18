export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export type FileCategory =
  | "archive"
  | "audio"
  | "image"
  | "video"
  | "office"
  | "text"
  | "code"
  | "pdf"
  | "adobe-raster"
  | "font"
  | "cad"
  | "apple"
  | "other";

export interface FileTypeGroup {
  id: FileCategory;
  label: string;
  extensions: string[];
  mimeTypes?: string[];
  mimePrefixes?: string[];
  acceptPatterns?: string[];
  preview: boolean;
}

export const FILE_TYPE_GROUPS: FileTypeGroup[] = [
  {
    id: "archive",
    label: "Archive Files",
    extensions: ["zip", "rar", "tar", "gz", "gzip", "tgz"],
    mimeTypes: [
      "application/zip",
      "application/x-zip-compressed",
      "application/x-rar-compressed",
      "application/vnd.rar",
      "application/x-tar",
      "application/gzip",
      "application/x-gzip",
      "application/x-gtar",
    ],
    preview: false,
  },
  {
    id: "audio",
    label: "Audio",
    extensions: ["mp3", "wav", "ogg", "opus"],
    mimeTypes: [
      "audio/mpeg",
      "audio/mp3",
      "audio/x-mpeg",
      "audio/wav",
      "audio/x-wav",
      "audio/ogg",
      "audio/opus",
    ],
    mimePrefixes: ["audio/"],
    acceptPatterns: ["audio/*"],
    preview: true,
  },
  {
    id: "image",
    label: "Image",
    extensions: ["jpeg", "jpg", "png", "gif", "bmp", "tiff", "tif", "svg", "webp"],
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/bmp",
      "image/tiff",
      "image/x-tiff",
      "image/svg+xml",
      "image/webp",
    ],
    mimePrefixes: ["image/"],
    acceptPatterns: ["image/*"],
    preview: true,
  },
  {
    id: "video",
    label: "Video",
    extensions: [
      "webm",
      "mpeg4",
      "mp4",
      "mpg",
      "mpeg",
      "3gpp",
      "3gp",
      "mov",
      "avi",
      "mpegps",
      "wmv",
      "flv",
      "ogv",
    ],
    mimeTypes: [
      "video/webm",
      "video/mp4",
      "video/mpeg",
      "video/3gpp",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-ms-wmv",
      "video/x-flv",
      "video/ogg",
    ],
    mimePrefixes: ["video/"],
    acceptPatterns: ["video/*"],
    preview: true,
  },
  {
    id: "office",
    label: "Microsoft Office",
    extensions: ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "xps"],
    mimeTypes: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-powerpoint.presentation.macroenabled.12",
      "application/vnd.ms-xpsdocument",
      "application/oxps",
    ],
    preview: true,
  },
  {
    id: "text",
    label: "Plain Text",
    extensions: ["txt"],
    mimeTypes: ["text/plain"],
    preview: true,
  },
  {
    id: "code",
    label: "Markup & Code",
    extensions: ["css", "html", "php", "c", "cpp", "h", "hpp", "js", "java", "py"],
    mimeTypes: [
      "text/html",
      "text/css",
      "application/javascript",
      "text/javascript",
      "text/x-php",
      "text/x-c",
      "text/x-c++",
      "text/x-c++src",
      "text/x-csrc",
      "text/x-java-source",
      "text/x-python",
      "text/x-script.python",
    ],
    preview: true,
  },
  {
    id: "pdf",
    label: "PDF & PostScript",
    extensions: ["pdf", "ai", "eps", "ps", "xps"],
    mimeTypes: [
      "application/pdf",
      "application/postscript",
      "application/eps",
      "application/x-eps",
      "application/illustrator",
      "application/vnd.ms-xpsdocument",
      "application/oxps",
    ],
    preview: true,
  },
  {
    id: "adobe-raster",
    label: "Adobe Photoshop",
    extensions: ["psd"],
    mimeTypes: [
      "image/vnd.adobe.photoshop",
      "application/x-photoshop",
      "application/photoshop",
    ],
    preview: true,
  },
  {
    id: "font",
    label: "Fonts",
    extensions: ["ttf"],
    mimeTypes: ["font/ttf", "application/x-font-ttf"],
    preview: false,
  },
  {
    id: "cad",
    label: "CAD",
    extensions: ["dxf"],
    mimeTypes: [
      "image/vnd.dxf",
      "application/dxf",
      "application/x-autocad",
      "application/autocad",
      "application/vnd.autodesk.autocad.dxf",
    ],
    preview: false,
  },
  {
    id: "apple",
    label: "Apple iWork",
    extensions: ["key", "numbers"],
    mimeTypes: [
      "application/x-iwork-keynote-sffkey",
      "application/vnd.apple.numbers",
    ],
    preview: false,
  },
];

const ALLOWED_FILE_EXTENSION_SET = new Set<string>();
const ALLOWED_FILE_MIME_SET = new Set<string>();
const ALLOWED_FILE_MIME_PREFIX_SET = new Set<string>();
const ACCEPT_TOKEN_SET = new Set<string>();

for (const group of FILE_TYPE_GROUPS) {
  for (const ext of group.extensions) {
    const normalized = ext.toLowerCase();
    ALLOWED_FILE_EXTENSION_SET.add(normalized);
    ACCEPT_TOKEN_SET.add(`.${normalized}`);
  }

  if (group.mimeTypes) {
    for (const mime of group.mimeTypes) {
      ALLOWED_FILE_MIME_SET.add(mime.toLowerCase());
      ACCEPT_TOKEN_SET.add(mime.toLowerCase());
    }
  }

  if (group.mimePrefixes) {
    for (const prefix of group.mimePrefixes) {
      ALLOWED_FILE_MIME_PREFIX_SET.add(prefix.toLowerCase());
    }
  }

  if (group.acceptPatterns) {
    for (const pattern of group.acceptPatterns) {
      ACCEPT_TOKEN_SET.add(pattern);
    }
  }
}

export const ALLOWED_FILE_EXTENSIONS = Array.from(ALLOWED_FILE_EXTENSION_SET).sort();
export const ALLOWED_FILE_MIME_TYPES = Array.from(ALLOWED_FILE_MIME_SET).sort();
export const ALLOWED_FILE_MIME_PREFIXES = Array.from(
  ALLOWED_FILE_MIME_PREFIX_SET
).sort();
export const ACCEPT_FILE_TYPES_ATTRIBUTE = Array.from(ACCEPT_TOKEN_SET)
  .sort()
  .join(",");

export function isAllowedFileType(
  mimeType: string | undefined | null,
  fileName: string
): boolean {
  const mime = (mimeType ?? "").toLowerCase();
  if (mime) {
    if (ALLOWED_FILE_MIME_SET.has(mime)) return true;
    for (const prefix of ALLOWED_FILE_MIME_PREFIX_SET) {
      if (mime.startsWith(prefix)) return true;
    }
  }

  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!extension) return false;

  return ALLOWED_FILE_EXTENSION_SET.has(extension);
}
