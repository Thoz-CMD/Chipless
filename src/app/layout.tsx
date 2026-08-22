// This file is required to enable i18n routing in Next.js App Router
// The actual layout with html/body tags is in [locale]/layout.tsx

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

// Suppress the warning about missing html/body tags
// The actual tags are in [locale]/layout.tsx
export const dynamic = 'force-dynamic';
