import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/globals.css'

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
        <nav className="p-4">
          <div id='nav' className="flex gap-4 hidden">
            <a href="/">Home</a>
            <a href="/dashboard">Dashboard</a>
            <a href="/screen-a">Screen A</a>
            <a href="/screen-b">Screen B</a>
          </div>
        </nav>
        <main className="p-0">
          {children}
        </main>
      </body>
    </html>
  )
} 