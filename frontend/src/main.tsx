import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import "@fontsource-variable/noto-sans";
import "@fontsource-variable/noto-serif";
import "./app/globals.css";
import "./app/viewport.css";
import { router } from "./router";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Không tìm thấy phần tử gốc của ứng dụng.");
}

function preventImageDrag(event: DragEvent) {
  if (event.target instanceof HTMLImageElement) {
    event.preventDefault();
  }
}
document.addEventListener("dragstart", preventImageDrag);
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    document.removeEventListener("dragstart", preventImageDrag);
  });
}

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
