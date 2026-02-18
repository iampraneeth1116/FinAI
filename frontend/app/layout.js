import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import AuthGuard from "./components/AuthGuard";
import { MobileNavProvider } from "./context/MobileNavContext";
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "FinAI - Personal Finance Intelligence",
  description: "Transform your financial data into clear insights with AI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50 h-screen overflow-hidden flex`}>
        <MobileNavProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col h-full relative overflow-hidden">
            <Navbar />
            <main className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="max-w-6xl mx-auto space-y-6">
                <AuthGuard>{children}</AuthGuard>
              </div>
            </main>
          </div>
        </MobileNavProvider>
      </body>
    </html>
  );
}
