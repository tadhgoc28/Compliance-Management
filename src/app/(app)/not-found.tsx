import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center p-6 text-center">
      <div>
        <p className="text-sm font-medium text-brand">Not found</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">
          We couldn&apos;t find that
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          The page or record you were looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
