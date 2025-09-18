export interface FileItem {
  id: string;
  name: string;
  original_name: string;
  size: number;
  mime_type: string;
  blob_url: string;
  folder_id: string | null;
  dataroom_id?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
  dataroom_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Dataroom {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileShare {
  id: string;
  file_id: string;
  shared_with_id: string | null;
  shared_by_id: string;
  permission: "view" | "edit";
  share_token: string | null;
  expires_at: string | null;
  created_at: string;
}

export type ViewMode = "grid" | "list" | "tree";

export type SortBy = "name" | "size" | "date" | "type";
export type SortOrder = "asc" | "desc";

export interface SearchFilters {
  query: string;
  fileTypes: string[];
  sizeRange: { min?: number; max?: number } | null;
  dateRange: { from?: string | Date; to?: string | Date } | null;
  owner: string | null;
  shared: boolean | null;
}
