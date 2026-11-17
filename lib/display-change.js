// Display precision must not turn a real movement into a misleading signed zero.
export function displayChange(value, unit) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const magnitude = Math.abs(value);
  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const prefix = direction === "up" ? "↑ " : direction === "down" ? "↓ " : "= ";
  if (magnitude > 0 && magnitude < 0.005)
    return prefix + "menos de 0,01 " + unit;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return (
    prefix +
    sign +
    magnitude.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) +
    " " +
    unit
  );
}
