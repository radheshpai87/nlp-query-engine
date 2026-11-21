import * as React from "react";
import { cn } from "@/lib/utils";

interface NexusLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

export function NexusLogo({ className, size = 24, ...props }: NexusLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-label="Nexus Query Logo"
      {...props}
    >
      <defs>
        <linearGradient id="nq-brand-grad" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="0.5" stopColor="#D97706" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>
        <filter id="nq-glow" x="2" y="2" width="28" height="28" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Modern Squircle Badge Container */}
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="7.5"
        className="fill-amber-500/10 stroke-amber-500/30 dark:fill-amber-500/15 dark:stroke-amber-500/40"
        strokeWidth="1"
      />

      {/* Interconnected Multi-Database Query Paths */}
      <path
        d="M8.5 22.5V9.5L23.5 22.5V9.5"
        stroke="url(#nq-brand-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#nq-glow)"
      />

      {/* Target Database Nodes (Postgres, Mongo, ES) */}
      <circle cx="8.5" cy="9.5" r="2" fill="#FBBF24" />
      <circle cx="23.5" cy="9.5" r="2" fill="#F59E0B" />
      <circle cx="8.5" cy="22.5" r="2" fill="#D97706" />
      <circle cx="23.5" cy="22.5" r="2" fill="#B45309" />

      {/* Core Synthesizer Intersection Spark */}
      <circle cx="16" cy="16" r="1.5" fill="#FEF3C7" className="animate-pulse" />
    </svg>
  );
}
