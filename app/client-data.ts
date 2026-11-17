/** Requests are bounded and cancelled when the owning tab or component is left. */
export async function fetchJson(
  url: string,
  signal: AbortSignal,
): Promise<any> {
  const request = new AbortController();
  const cancel = () => request.abort();
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) cancel();
  const timeout = setTimeout(cancel, 60000);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: request.signal,
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error("Consulta indisponível. Tente atualizar.");
    return data;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", cancel);
  }
}
