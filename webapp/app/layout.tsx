import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NRF XR Concert",
    template: "%s · NRF XR Concert",
  },
  description: "A multi-device audience and projection instrument for NRF XR Concert 2027.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#d9dedb",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // Browser extensions write attributes such as style="visibility: visible" on <html> before
    // hydration; this suppresses only that element's attribute diff, not the app tree's.
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
