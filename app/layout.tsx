import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/globals.css'
import { akkurat, basel, quadrant, droulers } from '@/styles/fonts'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Your App',
  description: 'A Next.js application with custom routing',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        
        <main className="p-0">
          {children}
        </main>
      </body>
    </html>
  )
} 