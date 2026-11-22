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
        {/* Luminous Ember & Sunburst Gradients */}
        <linearGradient id="nq-primary-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" />
          <stop offset="0.5" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>

        <linearGradient id="nq-accent-grad" x1="28" y1="4" x2="4" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FCD34D" />
          <stop offset="0.6" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>

        <linearGradient id="nq-core-glow" x1="16" y1="10" x2="16" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFBEB" stopOpacity="0.9" />
          <stop offset="1" stopColor="#F59E0B" stopOpacity="0.3" />
        </linearGradient>

        <linearGradient id="nq-container-border" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" stopOpacity="0.45" />
          <stop offset="1" stopColor="#D97706" stopOpacity="0.15" />
        </linearGradient>

        <filter id="nq-bloom" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Sleek Rounded Hex-Container Frame */}
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="8"
        fill="#12151B"
        stroke="url(#nq-container-border)"
        strokeWidth="1.2"
      />

      {/* Central Intersecting Multi-Database Geometric Prism */}
      {/* Top Facet (Relational / SQL Paradigm) */}
      <path
        d="M16 6.5L24 11.2V15.8L16 11.2L8 15.8V11.2L16 6.5Z"
        fill="url(#nq-primary-grad)"
        fillOpacity="0.9"
      />

      {/* Right Facet (Document / Mongo Paradigm) */}
      <path
        d="M24 16.5V21.5L16.8 25.5V20.5L24 16.5Z"
        fill="url(#nq-accent-grad)"
        fillOpacity="0.95"
      />

      {/* Left Facet (Search / ES Paradigm) */}
      <path
        d="M8 16.5L15.2 20.5V25.5L8 21.5V16.5Z"
        fill="url(#nq-primary-grad)"
        fillOpacity="0.75"
      />

      {/* Core Dynamic Focal Prism (The Nexus) */}
      <polygon
        points="16,11.5 20.8,16 16,20.5 11.2,16"
        fill="url(#nq-core-glow)"
        filter="url(#nq-bloom)"
      />

      {/* Central Point of Convergence */}
      <circle cx="16" cy="16" r="1.8" fill="#FFFFFF" />
    </svg>
  );
}
