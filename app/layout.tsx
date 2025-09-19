import React from 'react';
import './globals.css';

export const metadata = {
  title: 'POI Translation Portal',
  description: 'AI-powered multi-language POI translation management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
