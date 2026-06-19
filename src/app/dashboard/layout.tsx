import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — fasobet by ben rachid sawadogo",
  description: "Prédictions IA du jour",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}