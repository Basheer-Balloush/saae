export type Lang = 'ar' | 'en'

export const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
export const container = { padding: '20px 25px' }
export const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
export const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.7',
  margin: '0 0 25px',
}
export const link = { color: 'inherit', textDecoration: 'underline' }
export const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
export const code = {
  display: 'inline-block',
  padding: '12px 20px',
  fontSize: '24px',
  fontWeight: 'bold' as const,
  letterSpacing: '4px',
  backgroundColor: '#f4f4f5',
  borderRadius: '8px',
  color: '#000000',
}
export const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
