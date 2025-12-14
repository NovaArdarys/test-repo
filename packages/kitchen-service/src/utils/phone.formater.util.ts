import { z } from 'zod';

const phone = z.string();

export const transformPhoneNumber = async (phoneNumber: string) => {
  const error = await phone.safeParse(phoneNumber);

  if (error) {
    const cleanedNumber = phoneNumber.replace(/\+/g, "");

    let transformedNumber = cleanedNumber;
    if (cleanedNumber.startsWith("0") || `${cleanedNumber[0]}${cleanedNumber[1]}` !== "62") {
      transformedNumber = "62" + cleanedNumber.slice(1);
    }

    return transformedNumber;
  }

  return phoneNumber;
};