import { Sidebar } from "@/components/crm/sidebar";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <Sidebar />
      <div className="lg:pl-64">{children}</div>
    </div>
  );
}
