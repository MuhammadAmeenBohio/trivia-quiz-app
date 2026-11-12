import type { Metadata } from "next";
import { Fredoka, Inter } from "next/font/google";
import "./globals.css";
import SoundBoot from "@/components/SoundBoot";
import { cn } from "@/lib/utils";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trivia Quiz",
  description: "Funky trivia quiz game",
};

// Root shell: fonts and global audio wiring only.
// Page chrome (navbar/footer) lives in the (app) route group so /login can opt out.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("h-full font-sans", fredoka.variable, inter.variable)}>
      <body className="flex min-h-full flex-col text-foreground">
        <SoundBoot />
        {children}
      </body>
    </html>
  );
}
