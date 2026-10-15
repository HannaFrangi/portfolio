import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { siteUrl } from "@/lib/site";
import { themeBootScript } from "@/lib/theme-boot";
import "./globals.css";

// Self-hosted: the Google Fonts download is too slow on this network for next/font/google.
const serif = localFont({
  src: [
    { path: "./fonts/InstrumentSerif-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/InstrumentSerif-Italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument",
});

const display = localFont({
  src: [
    { path: "./fonts/Syne-500.woff2", weight: "500" },
    { path: "./fonts/Syne-700.woff2", weight: "700" },
    { path: "./fonts/Syne-800.woff2", weight: "800" },
  ],
  variable: "--font-syne",
});

// Wide geometric display face for the secret neo-Y2K look (variable, 500-800). Not
// preloaded: only visitors who unlock that look ever need it.
const displayY2k = localFont({
  src: [{ path: "./fonts/LexendExa-latin.woff2", weight: "500 800" }],
  variable: "--font-lexend-exa",
  preload: false,
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Hanna Al Frangi | React & React Native Developer",
  description:
    "Portfolio of Hanna Al Frangi, a React and React Native developer in Lebanon building web apps, mobile apps, admin dashboards and SaaS products.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Hanna Al Frangi | React & React Native Developer",
    description: "Web apps, mobile apps and admin dashboards for real clients.",
    type: "profile",
    url: "/",
    siteName: "Hanna Al Frangi",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hanna Al Frangi | React & React Native Developer",
    description: "Web apps, mobile apps and admin dashboards for real clients.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#dbdfd9" },
    { media: "(prefers-color-scheme: dark)", color: "#12150e" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-skin="classic"
      data-flavor="green"
      suppressHydrationWarning
      className={`${serif.variable} ${display.variable} ${displayY2k.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
