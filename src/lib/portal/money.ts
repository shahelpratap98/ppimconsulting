export const money = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" });

export const formatMoney = (n: number | string | null | undefined) =>
  n === null || n === undefined || n === "" ? "—" : money.format(Number(n));
