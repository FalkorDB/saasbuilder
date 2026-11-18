import DOMPurify from "isomorphic-dompurify";

const ALLOWED_STYLES: Record<string, RegExp> = {
  "text-align": /^(left|right|center|justify|start|end)$/,
  "white-space": /^pre-wrap$/,
};

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (!("getAttribute" in node)) return;

  const style = node.getAttribute("style");
  if (style !== null) {
    const allowedStyles = style
      .split(";")
      .map((declaration) => {
        const parts = declaration.toLowerCase().split(":");
        if (parts.length !== 2) return "";

        const [property, value] = parts.map((part) => part.trim());
        if (!Object.hasOwn(ALLOWED_STYLES, property) || !ALLOWED_STYLES[property].test(value)) return "";

        return `${property}: ${value}`;
      })
      .filter(Boolean)
      .join("; ");

    if (allowedStyles) node.setAttribute("style", allowedStyles);
    else node.removeAttribute("style");
  }

  if (["a", "area"].includes(node.nodeName.toLowerCase())) {
    const rel = new Set((node.getAttribute("rel") ?? "").split(/\s+/).filter(Boolean));
    rel.add("noopener");
    rel.add("noreferrer");
    node.setAttribute("rel", [...rel].join(" "));
  }
});

export const sanitizeHTML = (html?: string | null): string =>
  DOMPurify.sanitize(html ?? "", {
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select"],
  });
