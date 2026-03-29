// In-memory parent category hints to bridge BE DTOs that omit Category fields
const parentCategoryById = new Map();

export const setParentCategoryHint = (parentId, categoryKey) => {
  const pid = Number(parentId);
  if (!Number.isFinite(pid) || !categoryKey) return;
  parentCategoryById.set(pid, categoryKey);
};

export const getParentCategoryHint = (parentId) => {
  const pid = Number(parentId);
  if (!Number.isFinite(pid)) return undefined;
  return parentCategoryById.get(pid);
};

export const clearCategoryHints = () => parentCategoryById.clear();

export default { setParentCategoryHint, getParentCategoryHint, clearCategoryHints };


