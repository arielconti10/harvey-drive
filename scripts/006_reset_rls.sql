-- Reset RLS to minimal, non-recursive policies for core tables

-- Files
DROP POLICY IF EXISTS "Users can view accessible files" ON files;
DROP POLICY IF EXISTS "Users can view own files" ON files;
DROP POLICY IF EXISTS "Users can create own files" ON files;
DROP POLICY IF EXISTS "files_select_policy" ON files;
DROP POLICY IF EXISTS "files_insert_policy" ON files;
DROP POLICY IF EXISTS "files_update_policy" ON files;
DROP POLICY IF EXISTS "files_delete_policy" ON files;

CREATE POLICY files_select_policy ON files
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY files_insert_policy ON files
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY files_update_policy ON files
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY files_delete_policy ON files
  FOR DELETE USING (owner_id = auth.uid());

-- Folders
DROP POLICY IF EXISTS "Users can create own folders" ON folders;
DROP POLICY IF EXISTS "folders_select_policy" ON folders;
DROP POLICY IF EXISTS "folders_insert_policy" ON folders;
DROP POLICY IF EXISTS "folders_update_policy" ON folders;
DROP POLICY IF EXISTS "folders_delete_policy" ON folders;

CREATE POLICY folders_select_policy ON folders
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY folders_insert_policy ON folders
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY folders_update_policy ON folders
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY folders_delete_policy ON folders
  FOR DELETE USING (owner_id = auth.uid());

-- File shares
DROP POLICY IF EXISTS "File owners can view shares" ON file_shares;
DROP POLICY IF EXISTS "file_shares_select_policy" ON file_shares;
DROP POLICY IF EXISTS "file_shares_insert_policy" ON file_shares;
DROP POLICY IF EXISTS "file_shares_update_policy" ON file_shares;
DROP POLICY IF EXISTS "file_shares_delete_policy" ON file_shares;

CREATE POLICY file_shares_select_policy ON file_shares
  FOR SELECT USING (shared_by_id = auth.uid() OR shared_with_id = auth.uid());
CREATE POLICY file_shares_insert_policy ON file_shares
  FOR INSERT WITH CHECK (
    shared_by_id = auth.uid()
  );
CREATE POLICY file_shares_update_policy ON file_shares
  FOR UPDATE USING (shared_by_id = auth.uid());
CREATE POLICY file_shares_delete_policy ON file_shares
  FOR DELETE USING (shared_by_id = auth.uid());

-- Datarooms
DROP POLICY IF EXISTS "Create own datarooms" ON datarooms;
DROP POLICY IF EXISTS "datarooms_insert" ON datarooms;
DROP POLICY IF EXISTS "View own datarooms" ON datarooms;
DROP POLICY IF EXISTS "datarooms_select" ON datarooms;
DROP POLICY IF EXISTS "Update own datarooms" ON datarooms;
DROP POLICY IF EXISTS "datarooms_update" ON datarooms;
DROP POLICY IF EXISTS "Delete own datarooms" ON datarooms;
DROP POLICY IF EXISTS "datarooms_delete" ON datarooms;

CREATE POLICY datarooms_select ON datarooms
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY datarooms_insert ON datarooms
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY datarooms_update ON datarooms
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY datarooms_delete ON datarooms
  FOR DELETE USING (owner_id = auth.uid());
