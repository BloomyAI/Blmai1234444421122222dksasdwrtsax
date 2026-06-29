export const metadata = {
  title: 'Bloomy AI - Chat',
  description: 'AI-powered chat with multiple specialized agents',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
