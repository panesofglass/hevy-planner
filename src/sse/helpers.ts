export interface PatchOptions {
  selector?: string;
  mode?: "outer" | "inner" | "append" | "prepend" | "before" | "after" | "remove";
  useViewTransition?: boolean;
}

export function patchElements(html: string, opts?: PatchOptions): string {
  let lines = `event: datastar-patch-elements\n`;
  if (opts?.selector) lines += `data: selector ${opts.selector}\n`;
  if (opts?.mode) lines += `data: mode ${opts.mode}\n`;
  if (opts?.useViewTransition) lines += `data: useViewTransition true\n`;
  // Datastar v1: each continuation line must repeat "data: elements "
  const htmlLines = html.replace(/\n/g, "\ndata: elements ");
  lines += `data: elements ${htmlLines}\n\n`;
  return lines;
}

export function patchSignals(signals: Record<string, unknown>): string {
  return `event: datastar-patch-signals\ndata: signals ${JSON.stringify(signals)}\n\n`;
}

export function mergeFragments(fragments: string[]): string {
  return fragments.join("");
}

export function sseResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "connection": "keep-alive",
    },
  });
}

export function executeScript(script: string): string {
  return patchElements(`<script>${script}</script>`, { selector: "body", mode: "append" });
}

export function isSSERequest(request: Request): boolean {
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/event-stream");
}
