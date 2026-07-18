import { Image as ImageIcon } from "lucide-react";

/**
 * Photo thumbnail with a deterministic placeholder for demo mode.
 *
 * When there is no real file (demo data has no storage bucket), a colour derived
 * from the title stands in. It reads as "an image goes here" without faking a
 * real photograph of a real place, which matters given this is compliance data.
 */
export function PhotoThumb({
  title,
  url,
  className = "aspect-[4/3]",
}: {
  title: string;
  url: string | null | undefined;
  className?: string;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={title}
        loading="lazy"
        className={`w-full object-cover ${className}`}
      />
    );
  }

  const hue = [...title].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className={`grid w-full place-items-center ${className}`}
      style={{
        background: `linear-gradient(135deg, oklch(0.68 0.09 ${hue}), oklch(0.48 0.11 ${(hue + 45) % 360}))`,
      }}
    >
      <ImageIcon className="size-6 text-white/70" />
    </div>
  );
}
