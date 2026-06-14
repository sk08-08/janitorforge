// ============================================================================
// JanitorForge - Custom Scrollbar
// Global custom scrollbar component with smooth styling
// ============================================================================

"use client";

import { useEffect } from "react";

const scrollbarStyles = `
  /* Custom scrollbar for Webkit browsers (Chrome, Safari, Edge) */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  ::-webkit-scrollbar-track {
    background: #1a1a2e;
    border-radius: 10px;
    border: 1px solid #2a2a3e;
  }

  ::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #4a4a6a, #3a3a5a);
    border-radius: 10px;
    border: 2px solid #1a1a2e;
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  }

  ::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #5a5a7a, #4a4a6a);
    border: 2px solid #1a1a2e;
  }

  ::-webkit-scrollbar-thumb:active {
    background: linear-gradient(180deg, #6a6a8a, #5a5a7a);
  }

  /* Corner where scrollbars meet */
  ::-webkit-scrollbar-corner {
    background: #1a1a2e;
  }

  /* Firefox scrollbar */
  * {
    scrollbar-width: thin;
    scrollbar-color: #4a4a6a #1a1a2e;
  }

  /* Smooth scrolling for all elements */
  html {
    scroll-behavior: smooth;
  }

  /* Hide scrollbar but keep functionality */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Thin scrollbar variant */
  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .scrollbar-thin::-webkit-scrollbar-track {
    background: #1a1a2e;
    border: none;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: #4a4a6a;
    border: 1px solid #1a1a2e;
    border-radius: 6px;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: #5a5a7a;
  }

  /* Primary colored scrollbar */
  .scrollbar-primary::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #7c3aed, #6d28d9);
  }
  .scrollbar-primary::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #8b5cf6, #7c3aed);
  }
  .scrollbar-primary {
    scrollbar-color: #7c3aed #1a1a2e;
  }
`;

export function CustomScrollbar() {
  useEffect(() => {
    // Inject styles into head
    const style = document.createElement("style");
    style.id = "janitorforge-custom-scrollbar";
    style.textContent = scrollbarStyles;
    document.head.appendChild(style);

    return () => {
      const existing = document.getElementById("janitorforge-custom-scrollbar");
      if (existing) existing.remove();
    };
  }, []);

  return null;
}
