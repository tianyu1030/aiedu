import NavBar from "@/components/NavBar";
import Sidebar from "@/components/Sidebar";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { MainShifter } from "@/components/MainShifter";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-bg text-fg" data-themed>
        <Sidebar />
        <NavBar />
        <MainShifter>
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </MainShifter>
      </div>
    </SidebarProvider>
  );
}
