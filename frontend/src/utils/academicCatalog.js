/**
 * Query params for /degrees, /degrees/:id/branches, etc.
 * Superadmin: omit collegeId so the API uses the default catalog college (seeded demo.edu, else first college).
 * Other roles: always scope to the user's college.
 */
export function academicCatalogParams(user) {
  if (!user) return {};
  if (user.role === 'superadmin') return {};
  if (user.college_id != null && user.college_id !== '') {
    return { collegeId: String(user.college_id) };
  }
  return {};
}
