// Invite-Links sind token-gebunden und gehoeren nicht in Suchmaschinen.
export const metadata = { robots: { index: false, follow: false } };

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
