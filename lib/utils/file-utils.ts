import {
  FILE_TYPE_GROUPS,
  type FileCategory,
} from "@/lib/constants/files";

export type FileViewerType =
  | "image"
  | "video"
  | "audio"
  | "office"
  | "text"
  | "code"
  | "pdf"
  | "adobe-raster"
  | "unsupported";

const CATEGORY_TO_VIEWER: Record<FileCategory, FileViewerType> = {
  archive: "unsupported",
  audio: "audio",
  image: "image",
  video: "video",
  office: "office",
  text: "text",
  code: "code",
  pdf: "pdf",
  "adobe-raster": "adobe-raster",
  font: "unsupported",
  cad: "unsupported",
  apple: "office",
  other: "unsupported",
};

const CATEGORY_ICON_MAP: Record<FileCategory, string> = {
  archive: "🗜️",
  audio: "🎵",
  image: "🖼️",
  video: "🎬",
  office: "📑",
  text: "📄",
  code: "💻",
  pdf: "📕",
  "adobe-raster": "🎨",
  font: "🔤",
  cad: "📐",
  apple: "🍎",
  other: "📁",
};

const EXTENSION_TO_CATEGORY = new Map<string, FileCategory>();
const MIME_TO_CATEGORY = new Map<string, FileCategory>();
const MIME_PREFIX_MATCHERS: Array<{ prefix: string; category: FileCategory }> = [];

for (const group of FILE_TYPE_GROUPS) {
  for (const ext of group.extensions) {
    const normalized = ext.toLowerCase();
    if (!EXTENSION_TO_CATEGORY.has(normalized)) {
      EXTENSION_TO_CATEGORY.set(normalized, group.id);
    }
  }

  if (group.mimeTypes) {
    for (const mime of group.mimeTypes) {
      const normalized = mime.toLowerCase();
      if (!MIME_TO_CATEGORY.has(normalized)) {
        MIME_TO_CATEGORY.set(normalized, group.id);
      }
    }
  }

  if (group.mimePrefixes) {
    for (const prefix of group.mimePrefixes) {
      MIME_PREFIX_MATCHERS.push({ prefix: prefix.toLowerCase(), category: group.id });
    }
  }
}

// Ensure more specific prefixes run before generic ones like "text/".
MIME_PREFIX_MATCHERS.sort((a, b) => b.prefix.length - a.prefix.length);

const CODE_LIKE_EXTENSIONS = new Set([
  "json",
  "ts",
  "tsx",
  "jsx",
  "md",
  "yml",
  "yaml",
  "graphql",
]);

const TEXT_LIKE_EXTENSIONS = new Set(["csv", "log"]);

const CODE_LIKE_MIME_SNIPPETS = [
  "json",
  "javascript",
  "typescript",
  "xml",
  "yaml",
  "x-python",
  "x-java",
  "x-c",
  "x-c++",
];

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
}

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export function getFileCategory(
  mimeType: string | undefined | null,
  fileName?: string | null
): FileCategory {
  const mime = (mimeType ?? "").toLowerCase();
  const extension = fileName ? getFileExtension(fileName) : "";

  if (mime) {
    const exactMatch = MIME_TO_CATEGORY.get(mime);
    if (exactMatch) {
      return exactMatch;
    }
  }

  if (extension) {
    const extMatch = EXTENSION_TO_CATEGORY.get(extension);
    if (extMatch) {
      return extMatch;
    }
  }

  if (mime) {
    for (const { prefix, category } of MIME_PREFIX_MATCHERS) {
      if (mime.startsWith(prefix)) {
        // Avoid classifying Photoshop files as plain images if mime prefix is image/
        if (
          category === "image" &&
          (mime.includes("photoshop") || extension === "psd")
        ) {
          return "adobe-raster";
        }
        return category;
      }
    }
  }

  if (mime.startsWith("text/")) {
    return CODE_LIKE_MIME_SNIPPETS.some((snippet) => mime.includes(snippet))
      ? "code"
      : "text";
  }

  if (
    mime.includes("json") ||
    CODE_LIKE_MIME_SNIPPETS.some((snippet) => mime.includes(snippet))
  ) {
    return "code";
  }

  if (extension) {
    if (CODE_LIKE_EXTENSIONS.has(extension)) return "code";
    if (TEXT_LIKE_EXTENSIONS.has(extension)) return "text";
    if (extension === "psd") return "adobe-raster";
    if (["ai", "eps", "ps", "xps"].includes(extension)) return "pdf";
    if (["key", "numbers"].includes(extension)) return "apple";
  }

  return "other";
}

export function getFileViewerType(
  mimeType: string | undefined | null,
  fileName?: string | null
): FileViewerType {
  const category = getFileCategory(mimeType, fileName);
  return CATEGORY_TO_VIEWER[category] ?? "unsupported";
}

export function canPreview(
  mimeType: string | undefined | null,
  fileName?: string | null
): boolean {
  return getFileViewerType(mimeType, fileName) !== "unsupported";
}

export function getFileIcon(
  mimeType: string | undefined | null,
  fileName?: string | null
): string {
  const category = getFileCategory(mimeType, fileName);
  return CATEGORY_ICON_MAP[category] ?? CATEGORY_ICON_MAP.other;
}

export const canPreviewFile = canPreview;
