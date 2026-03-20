export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-3xl space-y-4 border-t border-[var(--line)] px-4 py-10 text-xs leading-relaxed text-[var(--muted2)] sm:px-6 sm:py-12">
      <p>
        Static data and daily seeds — star counts and IPO figures are snapshots
        for fair play, not live market data.
      </p>
      <p>
        Created by{" "}
        <a
          href="https://mokh.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] underline-offset-2 transition-colors hover:text-[var(--accent-bright)] hover:underline"
        >
          mokh.xyz
        </a>
      </p>
    </footer>
  );
}
