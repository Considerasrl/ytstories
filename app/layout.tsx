import type { Metadata, Viewport } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "YTStories | Share YouTube Videos on Instagram",
  description:
    "Create and download or share on Instagram a story image for any YouTube video. Customize your Instagram story with our user-friendly tool.",
  keywords: [
    "Instagram story",
    "YouTube video",
    "create story",
    "story image",
    "generate image",
    "download image",
    "share on Instagram",
  ],
  openGraph: {
    title: "Create Instagram Story for YouTube Video | Generate Story Image",
    description:
      "Create and download or share on Instagram a story image for any YouTube video. Customize your Instagram story with our user-friendly tool.",
    type: "website",
    url: "https://ytstories.com/",
    images: ["https://ytstories.com/card.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Create Instagram Story for YouTube Video | Generate Story Image",
    description:
      "Create and download or share on Instagram a story image for any YouTube video. Customize your Instagram story with our user-friendly tool.",
  },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
