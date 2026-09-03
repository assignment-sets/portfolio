import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
  { href: "/#skills", label: "Skills" },
  { href: "/#projects", label: "Projects" },
  { href: "/#experience", label: "Experience" },
  { href: "/#education", label: "Education" },
  { href: "/#contact", label: "Contact" },
];

export default function Navbar() {
  return (
    <nav>
      <div className="nav-inner">
        <Link className="nav-name" href="/#hero">
          Gourab Mondal
        </Link>
        <div className="nav-links-wrap">
          <ul className="nav-links">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
          <ThemeToggle />
        </div>
      </div>
      <div className="nav-mobile-links">
        <ul className="nav-links">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
