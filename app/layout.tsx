import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/globals.css'
import { MaintenanceProvider } from '@/maintenance/MaintenanceProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Gretel Screens',
  description: 'Screens... at Gretel',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <MaintenanceProvider>
          <main className="p-0">
            {children}
          </main>
        </MaintenanceProvider>
      </body>
    </html>
  )
} 