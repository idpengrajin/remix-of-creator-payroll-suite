import { z } from 'zod';

// Profile validation schema
export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  tiktok_account: z.string().trim().max(50, 'Username TikTok maksimal 50 karakter').optional().or(z.literal('')),
  nama_bank: z.string().trim().max(100, 'Nama bank maksimal 100 karakter').optional().or(z.literal('')),
  nomor_rekening: z.string().trim().max(50, 'Nomor rekening maksimal 50 karakter').optional().or(z.literal('')),
  nama_pemilik_rekening: z.string().trim().max(100, 'Nama pemilik rekening maksimal 100 karakter').optional().or(z.literal('')),
});

// Sales validation schema
export const salesSchema = z.object({
  gmv: z.number().min(0, 'GMV tidak boleh negatif').max(999999999999, 'GMV terlalu besar'),
  commission_gross: z.number().min(0, 'Komisi tidak boleh negatif').max(999999999999, 'Komisi terlalu besar'),
  date: z.string().min(1, 'Tanggal wajib diisi'),
  source: z.enum(['TIKTOK', 'SHOPEE', 'TOKOPEDIA'], { required_error: 'Sumber wajib dipilih' }),
});

// Creator validation schema
export const creatorSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  email: z.string().trim().email('Email tidak valid').max(255, 'Email maksimal 255 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter').max(100, 'Password maksimal 100 karakter'),
  tiktok_account: z.string().trim().max(50, 'Username TikTok maksimal 50 karakter').optional().or(z.literal('')),
  niche: z.string().trim().max(100, 'Niche maksimal 100 karakter').optional().or(z.literal('')),
  base_salary: z.number().min(0, 'Gaji tidak boleh negatif').max(999999999999, 'Gaji terlalu besar'),
  nama_bank: z.string().trim().max(100, 'Nama bank maksimal 100 karakter').optional().or(z.literal('')),
  nomor_rekening: z.string().trim().max(50, 'Nomor rekening maksimal 50 karakter').optional().or(z.literal('')),
  nama_pemilik_rekening: z.string().trim().max(100, 'Nama pemilik rekening maksimal 100 karakter').optional().or(z.literal('')),
});

// Inventory validation schema
export const inventorySchema = z.object({
  nama_barang: z.string().trim().min(1, 'Nama barang wajib diisi').max(200, 'Nama barang maksimal 200 karakter'),
  kategori: z.string().trim().min(1, 'Kategori wajib diisi').max(100, 'Kategori maksimal 100 karakter'),
  catatan: z.string().trim().max(1000, 'Catatan maksimal 1000 karakter').optional().or(z.literal('')),
});

// Password change validation schema
export const passwordChangeSchema = z.object({
  newPassword: z.string().min(6, 'Password minimal 6 karakter').max(100, 'Password maksimal 100 karakter'),
  confirmPassword: z.string().min(6, 'Password minimal 6 karakter').max(100, 'Password maksimal 100 karakter'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Password tidak cocok",
  path: ["confirmPassword"],
});
