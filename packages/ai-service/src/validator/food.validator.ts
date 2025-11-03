import z from 'zod';

export const labelSchema = z.object({
  en: z.string().min(1, 'Label bahasa Inggris harus diisi'),
  id: z.string().min(1, 'Label bahasa Indonesia harus diisi')
});

export const detectFoodSchema = z.object({
  image: z.string().or(z.string().min(1, 'Image base64 tidak boleh kosong')),
  labels: z.array(labelSchema).nonempty('Harus ada minimal 1 label'),
});

export type DetectFoodInput = z.infer<typeof detectFoodSchema>;