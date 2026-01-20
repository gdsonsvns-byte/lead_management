import type { Metadata } from "next";
import "./globals.css";
import Providers from "../lib/providers";
import AuthBoundary from "../context/auth_boundry";

export const metadata: Metadata = {
  title: "Lead Management System",
  description: "Lead Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet"></link>
      </head>
      <body>
        <AuthBoundary>
          <Providers>
            {children}
          </Providers>
        </AuthBoundary>
      </body>
    </html>
  );
}
