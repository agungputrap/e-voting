"use client";

import Image from "next/image";
import { useState } from "react";
import type { ImgHTMLAttributes, ReactNode } from "react";

type Props = {
  src?: string | null;
  fallback?: ReactNode;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, "src">;

export default function ImageWithFallback({
  src,
  fallback,
  onError,
  ...rest
}: Props) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-white/10 text-xs uppercase tracking-[0.2em] text-white/60">
        No Preview
      </div>
    );
  }

  return (
     
    <Image
      {...rest}
      src={src}
      alt="Image"
      width={100}
      height={100}
      className="h-full w-full object-cover"
      onError={(event) => {
        setHasError(true);
        onError?.(event);
      }}
    />
  );
}

