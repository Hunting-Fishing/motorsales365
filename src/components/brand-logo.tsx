import logoSrc from "@/assets/logo-small.webp";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: number;
  alt?: string;
}

export function BrandLogo({
  className,
  size = 40,
  alt = "365 MotorSales Philippines",
}: BrandLogoProps) {
  return (
    <img
      src={logoSrc}
      alt={alt}
      width={size}
      height={size}
      className={cn("object-contain", className)}
      style={{ width: size, height: size }}
      loading="eager"
    />
  );
}

export { logoSrc };
