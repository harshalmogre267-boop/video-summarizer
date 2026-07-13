import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "TubeSense | AI YouTube Summarizer & Learning Companion",
  description: "Transform long YouTube videos into structured summaries, study notes, quizzes, interactive chat discussions, and repurposed social media content in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-grow w-full flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}

