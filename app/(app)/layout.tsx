import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Persistent app shell: the navbar and footer stay mounted across route changes.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8">{children}</main>
      <Footer />
    </>
  );
}
