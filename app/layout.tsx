import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Should you overpay your student loan?";
const description =
  "A UK student loan calculator: see whether paying extra saves you money, or just pays off debt that gets written off.";

// metadataBase is filled in automatically on Vercel.
export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, siteName: "Overpay or not?", type: "website", locale: "en_GB" },
  twitter: { card: "summary_large_image", title, description },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GB"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
