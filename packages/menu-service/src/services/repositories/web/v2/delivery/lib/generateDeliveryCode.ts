function shortEncodeId(id: string) {
  const bytes = new TextEncoder().encode(id);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  let b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return b64.slice(0, 8);
}

export function generateDeliveryCode(
  kitchenId: string,
  beneficiaryId: string,
  portionType: string
) {
  const kitchenCode = shortEncodeId(kitchenId);
  const beneficiaryCode = shortEncodeId(beneficiaryId);
  const portionCode = portionType.toUpperCase().slice(0, 2);

  return `${kitchenCode}-${beneficiaryCode}-${portionCode}`;
}

export function decodeDeliveryCode(code: string) {
  const [kitchenCode, beneficiaryCode, portionCode] = code.split("-");
  return {
    kitchenCode,
    beneficiaryCode,
    portionType: portionCode
  };
}
