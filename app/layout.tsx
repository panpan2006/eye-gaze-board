import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eye Gaze Board",
  description: "Eye gaze communication board",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
    <Script
  src="/webgazer.js"
  strategy="afterInteractive"
/>
      </body>
    </html>
  );
}