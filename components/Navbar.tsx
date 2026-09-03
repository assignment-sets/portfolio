"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
  { href: "/#skills", label: "Skills" },
  { href: "/#projects", label: "Projects" },
  { href: "/#experience", label: "Experience" },
  { href: "/#education", label: "Education" },
  { href: "/#contact", label: "Contact" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  // Lock body scrolling when full-screen menu is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close overlay on Escape key press
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <nav>
      <div className="nav-inner">
        <Link
          className="nav-name"
          href="/#hero"
          onClick={() => setIsOpen(false)}
        >
          Gourab Mondal
        </Link>
        <div className="nav-links-wrap">
          {/* Desktop links */}
          <ul className="nav-links">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>

          <ThemeToggle />

          {/* Borderless mobile menu toggle (single persistent button, 0 layout shift) */}
          <button
            type="button"
            className="nav-mobile-toggle"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label={
              isOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={isOpen}
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Full-Screen Mobile Navigation Overlay (anchored beneath persistent navbar) */}
      {isOpen && (
        <div className="nav-fullscreen-overlay">
          <div className="nav-fullscreen-body">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav-fullscreen-link"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="nav-fullscreen-footer">
            Kolkata, India &middot; Available for work
          </div>
        </div>
      )}
    </nav>
  );
}
