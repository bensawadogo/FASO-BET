"use client";

import { useState } from "react";
import { Shield } from "lucide-react";

interface TeamLogoProps {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
}

export function TeamLogo({ src, alt, size = 48, className = "" }: TeamLogoProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-800 rounded-full ${className}`}
        style={{ width: size, height: size }}
        aria-label={alt}
      >
        <Shield
          style={{ width: size * 0.5, height: size * 0.5 }}
          className="text-gray-500"
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
