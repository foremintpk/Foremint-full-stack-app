export interface DocumentAuthRecord {
  profile_id: string;
  order_id: string | null;
}

/**
 * Returns true if the given role/userId combo may view the document.
 *
 * Staff (administrator, manager, account_manager) – always. An account manager
 *   works LLC orders end to end, which means opening the Articles, the EIN
 *   letter and the members' identity documents; without this they see a file
 *   list they cannot open.
 * Customer – when the document belongs to their profile.
 *   Access to admin-replaced documents (profile_id = admin) is handled at the
 *   DB level by the "Customers can read order documents" RLS policy — the
 *   SELECT itself returns null if unauthorized.
 */
export function canViewDocument(
  role: string | null,
  userId: string,
  doc: DocumentAuthRecord
): boolean {
  if (role === 'administrator') return true;
  if (role === 'manager') return true;
  if (role === 'account_manager') return true;
  return doc.profile_id === userId;
}

/**
 * Returns true if the given role may create, update, or delete documents.
 *
 * Administrators, and account managers within their LLC remit — uploading a
 * filed Articles or replacing a superseded document is part of working an
 * order. Managers are deliberately excluded here, as they were before.
 */
export function canManageDocument(role: string | null): boolean {
  return role === 'administrator' || role === 'account_manager';
}
