
export function academicCatalogParams(user) {
  if (!user) return {};
  if (user.role === 'superadmin') return {};
  if (user.college_id != null && user.college_id !== '') {
    return { collegeId: String(user.college_id) };
  }
  return {};
}
