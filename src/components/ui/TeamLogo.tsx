"use client"

import Image from 'next/image'
import { useState } from 'react'
import { Shield } from 'lucide-react'
import { useTeamLogo, getTeamLogoPath } from '@/hooks/useTeamLogo'

interface TeamLogoProps {
  teamName: string
  size?: number
  className?: string
  showName?: boolean
}

export function TeamLogo({
  teamName,
  size = 40,
  className = '',
  showName = false
}: TeamLogoProps) {
  const logoPath = useTeamLogo(teamName)
  const [error, setError] = useState(false)

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {logoPath !== '/logos/default.png' && logoPath ? (
        <Image
          src={logoPath}
          alt={`Logo ${teamName}`}
          width={size}
          height={size}
          className="rounded-full object-contain"
          onError={() => setError(true)}
          priority={size > 60}
        />
      ) : (
        <div
          className="flex items-center justify-center bg-gray-800 rounded-full border border-gray-700"
          style={{ width: size, height: size }}
        >
          <Shield size={size * 0.5} className="text-gray-500" />
        </div>
      )}
      {showName && (
        <span className="text-xs text-gray-400 text-center max-w-[80px] truncate">
          {teamName}
        </span>
      )}
    </div>
  );
}

interface TeamLogoStaticProps {
  teamName: string
  size?: number
  className?: string
}

export function TeamLogoStatic({
  teamName,
  size = 40,
  className = ''
}: TeamLogoStaticProps) {
  const logoPath = getTeamLogoPath(teamName)

  return (
    <Image
      src={logoPath}
      alt={`Logo ${teamName}`}
      width={size}
      height={size}
      className={`rounded-full object-contain ${className}`}
      onError={() => {}}
    />
  )
}
