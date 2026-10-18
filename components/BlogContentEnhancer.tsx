"use client";

import { useEffect, useRef } from "react";

interface BlogContentEnhancerProps {
  /**
   * Optional key that triggers re-enhancement when changed (e.g. previewHtml in Studio)
   */
  dependencyKey?: string | number;
}

const COPY_ICON_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
const CHECK_ICON_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

export default function BlogContentEnhancer({ dependencyKey }: BlogContentEnhancerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Find the enclosing article or nearest blog-post-body container
    const parentContainer =
      containerRef.current?.closest(".blog-article, .blog-post-body-container, .studio-preview-pane") ||
      document.querySelector(".blog-post-body");

    if (!parentContainer) return;

    let isDestroyed = false;

    // ── 1. Attach Code Copy Buttons ──
    const codeWrappers = parentContainer.querySelectorAll<HTMLElement>(".code-block-wrapper");
    codeWrappers.forEach((wrapper) => {
      const header = wrapper.querySelector<HTMLElement>(".code-block-header");
      if (!header || header.querySelector(".code-copy-btn")) return;

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "code-copy-btn";
      copyBtn.setAttribute("aria-label", "Copy code to clipboard");
      copyBtn.setAttribute("title", "Copy code");
      copyBtn.innerHTML = `${COPY_ICON_SVG}<span class="code-copy-label">Copy</span>`;

      copyBtn.addEventListener("click", async () => {
        const pre = wrapper.querySelector("pre");
        if (!pre) return;

        // Clone code node to strip any diff annotation markers if needed
        const rawText = pre.innerText || pre.textContent || "";

        try {
          await navigator.clipboard.writeText(rawText);
          copyBtn.classList.add("copied");
          copyBtn.innerHTML = `${CHECK_ICON_SVG}<span class="code-copy-label">Copied!</span>`;

          setTimeout(() => {
            if (!isDestroyed && copyBtn) {
              copyBtn.classList.remove("copied");
              copyBtn.innerHTML = `${COPY_ICON_SVG}<span class="code-copy-label">Copy</span>`;
            }
          }, 2000);
        } catch (err) {
          console.error("Failed to copy code to clipboard:", err);
        }
      });

      header.appendChild(copyBtn);
    });

    // ── 2. Auto-Wrap Tables inside .blog-post-body for Mobile Horizontal Scroll ──
    const tables = parentContainer.querySelectorAll<HTMLTableElement>("table");
    tables.forEach((table) => {
      if (!table.parentElement?.classList.contains("table-wrapper")) {
        const wrapper = document.createElement("div");
        wrapper.className = "table-wrapper";
        table.parentNode?.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }
    });

    // ── 3. Dynamic Mermaid Diagrams ──
    const mermaidContainers = parentContainer.querySelectorAll<HTMLElement>(".mermaid-diagram");
    if (mermaidContainers.length === 0) {
      return () => {
        isDestroyed = true;
      };
    }

    const getIsDark = () => {
      const themeAttr = document.documentElement.getAttribute("data-theme");
      if (themeAttr === "dark") return true;
      if (themeAttr === "light") return false;
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    };

    let diagramCounter = 0;

    const renderAllMermaid = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        const isDark = getIsDark();

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "neutral",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          securityLevel: "loose",
          themeVariables: isDark
            ? {
                primaryColor: "#2a2a2a",
                primaryTextColor: "#e8e8e8",
                primaryBorderColor: "#444444",
                lineColor: "#888888",
                secondaryColor: "#1e1e1e",
                tertiaryColor: "#161616",
                background: "#1e1e1e",
                mainBkg: "#1e1e1e",
                nodeBorder: "#444444",
              }
            : {
                primaryColor: "#f7f7f7",
                primaryTextColor: "#111111",
                primaryBorderColor: "#e0e0e0",
                lineColor: "#666666",
                secondaryColor: "#ffffff",
                tertiaryColor: "#f0f0f0",
                background: "#ffffff",
                mainBkg: "#ffffff",
                nodeBorder: "#e0e0e0",
              },
        });

        for (const container of mermaidContainers) {
          if (isDestroyed) break;
          const encodedCode = container.getAttribute("data-mermaid-code");
          if (!encodedCode) continue;

          const rawCode = decodeURIComponent(encodedCode);
          const uniqueId = `mermaid-svg-${Date.now()}-${++diagramCounter}`;

          try {
            const { svg } = await mermaid.render(uniqueId, rawCode);
            if (!isDestroyed) {
              container.innerHTML = `
                <div class="mermaid-svg-wrapper">
                  <div class="mermaid-svg-scroll">
                    ${svg}
                  </div>
                </div>
              `;
            }
          } catch (renderError) {
            console.error("Mermaid diagram render error:", renderError);
            if (!isDestroyed) {
              container.innerHTML = `
                <div class="mermaid-error-notice">
                  <span class="mermaid-error-title">Diagram Render Error</span>
                  <pre class="mermaid-error-code">${rawCode}</pre>
                </div>
              `;
            }
          }
        }
      } catch (err) {
        console.error("Failed to load or initialize Mermaid:", err);
      }
    };

    renderAllMermaid();

    // ── 3. Theme Observer for Dynamic Re-rendering ──
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-theme"
        ) {
          renderAllMermaid();
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => renderAllMermaid();
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      isDestroyed = true;
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, [dependencyKey]);

  return <div ref={containerRef} className="blog-content-enhancer-anchor" style={{ display: "none" }} />;
}
