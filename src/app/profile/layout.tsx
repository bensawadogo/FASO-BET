import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil — fasobet by ben rachid sawadogo",
  description: "Votre profil et vos statistiques sur fasobet by ben rachid sawadogo",
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}