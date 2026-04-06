export function toDateText(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toLocaleString("zh-CN");
  try {
    if (typeof (value as any).toDate === "function") {
      return (value as any).toDate().toLocaleString("zh-CN");
    }
  } catch {}
  return String(value);
}
