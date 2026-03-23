import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Data Tool',
  description: 'Transform, clean, and analyze CSV data with filtering, sorting, grouping, and anonymization features',
}

export default function DataToolLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
} 