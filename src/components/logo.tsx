import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      {...props}
    >
      <circle cx="128" cy="128" r="128" fill="hsl(var(--primary))" />
      <text
        x="128"
        y="170"
        fontFamily="Literata, serif"
        fontWeight="bold"
        fontSize="120"
        textAnchor="middle"
        fill="hsl(var(--primary-foreground))"
      >
        O
      </text>
    </svg>
  );
}
