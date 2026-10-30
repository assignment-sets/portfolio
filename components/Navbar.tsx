"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
  { href: "/#skills", label: "Skills" },
  { href: "/#projects", label: "Projects" },
  { href: "/#experience", label: "Experience" },
  { href: "/#education", label: "Education" },
  { href: "/#contact", label: "Contact" },
  { href: "/blog", label: "Blog" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

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

  // Trap focus and close overlay on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        toggleRef.current?.focus();
        return;
      }

      if (event.key === "Tab") {
        const overlay = overlayRef.current;
        const toggle = toggleRef.current;
        if (!overlay || !toggle) return;

        const focusable = [
          toggle,
          ...Array.from(overlay.querySelectorAll<HTMLElement>("a, button")),
        ];

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
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
          aria-label="Gourab Mondal"
        >
          GM
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
            ref={toggleRef}
            type="button"
            className="nav-mobile-toggle"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label={
              isOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={isOpen}
            aria-controls="mobile-nav-panel"
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Full-Screen Mobile Navigation Overlay (anchored beneath persistent navbar) */}
      {isOpen && (
        <div
          ref={overlayRef}
          id="mobile-nav-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="nav-fullscreen-overlay"
        >
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
