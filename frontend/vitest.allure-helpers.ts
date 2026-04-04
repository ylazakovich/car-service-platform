/** Map test file path → Allure "feature" (Behaviors second level under epic). */
export function allureFeatureFromFrontendPath(filepath: string): string {
  const norm = filepath.replace(/\\/g, "/");
  if (norm.includes("/src/api/")) return "API clients";
  if (norm.includes("/src/components/")) return "Components";
  if (/App\.smoke\.test\./i.test(norm)) return "App (smoke)";
  return "Other";
}
