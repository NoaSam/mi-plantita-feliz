import { Link } from "react-router-dom";

const links = [
  { to: "/privacidad", label: "Privacidad" },
  { to: "/cookies", label: "Cookies" },
  { to: "/aviso-legal", label: "Aviso legal" },
  { to: "/terminos", label: "Términos" },
] as const;

export default function LegalFooter() {
  return (
    <nav
      aria-label="Enlaces legales"
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-6 text-sm text-muted-foreground"
    >
      {links.map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
