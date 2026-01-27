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
