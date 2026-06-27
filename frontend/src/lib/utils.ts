import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
}
