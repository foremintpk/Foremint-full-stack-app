export interface DocumentAuthRecord {
  profile_id: string;
  order_id: string | null;
}

/**
 * Returns true if the given role/userId combo may view the document.
 *
 * Admin/Manager – always.
 * Customer      – when the document belongs to their profile.
 *                 Access to admin-replaced documents (profile_id = admin) is
 *                 handled at the DB level by the "Customers can read order documents"
 *                 RLS policy — the SELECT itself returns null if unauthorized.
 */
export function canViewDocument(
  role: string | null,
  userId: string,
  doc: DocumentAuthRecord
): boolean {
  if (role === 'administrator') return true;
  if (role === 'manager') return true;
  return doc.profile_id === userId;
}

/**
 * Returns true if the given role may create, update, or delete documents.
 * Only administrators are allowed.
 */
export function canManageDocument(role: string | null): boolean {
  return role === 'administrator';
}
