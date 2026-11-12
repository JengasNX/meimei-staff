import { PublicFooter, PublicHeader } from "@/components/public-shell";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">{children}</main>
      <PublicFooter />
    </>
  );
}
