import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DMP Projects',
  description: 'Imaginary Projects for a Data Management Plan assignment',
}

export default function DMPLayout({
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