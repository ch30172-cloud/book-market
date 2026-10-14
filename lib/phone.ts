export function normalizePhone(input: string): string {
  if (!/^[+\d\s().-]+$/.test(input)) throw new Error("מספר הטלפון אינו תקין");
  let value = input.replace(/[\s().-]/g, "");
  if (value.startsWith("00972")) value = "+" + value.slice(2);
  if (value.startsWith("+972")) value = "0" + value.slice(4);
  else if (value.startsWith("972")) value = "0" + value.slice(3);
  // Mobile, Israeli landline, and 07 VoIP numbers (including kosher phones).
  if (!/^(?:05\d{8}|0[23489]\d{7}|07\d{8})$/.test(value))
    throw new Error("יש להזין מספר טלפון ישראלי תקין");
  return "+972" + value.slice(1);
}
export const displayPhone = (phone: string) => "0" + phone.slice(4);
