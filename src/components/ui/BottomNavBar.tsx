"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ScrollText, Medal, User } from "lucide-react";

export function BottomNavBar() {
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", label: "ANALYSES", icon: BarChart3 },
    { href: "/coupon", label: "COUPON", icon: ScrollText },
    { href: "/premium", label: "PRÉMIUM", icon: Medal },
    { href: "/profile", label: "COMPTE", icon: User },
  ];

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <nav className="fixed bottom-0 w-full z-50 bg-surface-deep border-t border-outline-variant flex justify-around items-center h-[72px] px-base">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 h-full w-full transition-colors active:opacity-80 ${
              active
                ? "text-amber-400 border-t-2 border-amber-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Icon className="w-6 h-6" />
            <span className="font-label-caps text-label-caps uppercase">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
