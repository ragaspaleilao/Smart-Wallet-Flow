import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const categoryIcons: Record<string, string> = {
  'Alimentação': '🍔',
  'Transporte': '🚗',
  'Lazer': '🎉',
  'Saúde': '💊',
  'Educação': '📚',
  'Moradia': '🏠',
  'Salário': '💰',
  'Vendas': '📈',
  'Serviços': '🛠️',
  'Outros': '🛍️',
};

export function getCategoryIcon(category: string) {
  return categoryIcons[category] || '🛍️';
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseLocalDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) {
    dateStr = dateStr.toISOString();
  }
  const raw = String(dateStr || '');
  if (raw.length === 10) {
    return new Date(`${raw}T12:00:00`);
  }
  if (raw.includes('T00:00:00') || raw.includes('T03:00:00')) {
    const dateOnly = raw.split('T')[0];
    return new Date(`${dateOnly}T12:00:00`);
  }
  return new Date(raw);
}
