import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نيكست NT | تقديم العائلة",
  description: "قدّم طلب انضمامك لعائلة نيكست NT في مقاطعة بوليتو.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
