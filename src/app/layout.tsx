import type { Metadata } from "next";
import { Inter } from "next/font/google"; // If you want Google Fonts, make sure next/font is working or remove this. Using standard import for now.
import "./globals.css";

// Just in case next/font is not set up perfectly, we can fallback or use it. 
// Assuming standard setup.
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "경기고 89회 불어반 골프회",
    description: "경기고 89회 불어반 골프 모임 AntiGravity",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko">
            <body className={inter.className}>{children}</body>
        </html>
    );
}
