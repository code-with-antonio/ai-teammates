import { cn } from "@/lib/utils";
import type { Experimental_GeneratedImage } from "ai";

// uint8Array is optional so images that only exist as base64 can be shown
export type ImageProps = Pick<
  Experimental_GeneratedImage,
  "base64" | "mediaType"
> &
  Partial<Pick<Experimental_GeneratedImage, "uint8Array">> & {
  className?: string;
  alt?: string;
};

export const Image = ({
  base64,
  uint8Array: _uint8Array,
  mediaType,
  ...props
}: ImageProps) => (
  <img
    {...props}
    alt={props.alt}
    className={cn(
      "h-auto max-w-full overflow-hidden rounded-md",
      props.className
    )}
    src={`data:${mediaType};base64,${base64}`}
  />
);
