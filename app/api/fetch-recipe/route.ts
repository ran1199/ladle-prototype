// Ladle's only server route in Milestone 6: fetches a recipe web page so the
// browser can read its ingredients (browsers can't read other sites directly).
// Safety rules: https only; never connect to private, local or internal
// addresses (checked at connect time, so a DNS trick can't slip past); at most
// 3 redirects, each checked again; 8 seconds; 2 MB. Nothing is stored.

import { lookup } from "node:dns";
import { request } from "node:https";
import type { IncomingMessage } from "node:http";
import type { LookupAddress } from "node:dns";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import type { Readable } from "node:stream";
import { checkFetchUrl, isPrivateAddress, parseRecipePage } from "@/lib/mock-ai/webpage";

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

class FetchProblem extends Error {
  constructor(
    message: string,
    readonly status = 422,
  ) {
    super(message);
  }
}

/** A DNS lookup that refuses private addresses, used for the actual connection. */
function safeLookup(
  hostname: string,
  options: { all?: boolean; family?: number | string },
  callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
) {
  lookup(hostname, { all: true }, (err, addresses) => {
    if (err) return callback(err, "");
    const list = addresses as LookupAddress[];
    if (list.length === 0 || list.some((a) => isPrivateAddress(a.address))) {
      return callback(Object.assign(new Error("blocked-address"), { code: "EBLOCKED" }), "");
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

function get(url: URL, signal: AbortSignal): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: "GET",
        lookup: safeLookup as never,
        signal,
        headers: {
          "user-agent": "LadlePrototype/0.1 (+https://ladle-prototype.vercel.app; reads recipe ingredients)",
          accept: "text/html,application/xhtml+xml",
          "accept-encoding": "gzip, deflate, br",
          "accept-language": "en",
        },
      },
      resolve,
    );
    req.on("error", reject);
    req.end();
  });
}

async function readBody(res: IncomingMessage): Promise<string> {
  const encoding = String(res.headers["content-encoding"] ?? "").toLowerCase();
  let stream: Readable = res;
  if (encoding === "gzip") stream = res.pipe(createGunzip());
  else if (encoding === "deflate") stream = res.pipe(createInflate());
  else if (encoding === "br") stream = res.pipe(createBrotliDecompress());

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    size += (chunk as Buffer).length;
    if (size > MAX_BYTES) {
      res.destroy();
      throw new FetchProblem("That page is too big for Ladle to read. Paste the ingredients instead.");
    }
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function fetchPage(start: URL): Promise<string> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await get(url, signal);
    const status = res.statusCode ?? 0;
    if (status >= 300 && status < 400 && res.headers.location) {
      res.resume();
      const next = checkFetchUrl(new URL(res.headers.location, url).toString());
      if (!next) throw new FetchProblem("That link redirects somewhere Ladle can’t open.");
      url = next;
      continue;
    }
    if (status < 200 || status >= 300) {
      res.resume();
      throw new FetchProblem("Ladle couldn’t open that page. Paste the ingredients instead.");
    }
    const type = String(res.headers["content-type"] ?? "");
    if (!/text\/html|application\/xhtml/i.test(type)) {
      res.resume();
      throw new FetchProblem("That link isn’t a web page Ladle can read.");
    }
    return readBody(res);
  }
  throw new FetchProblem("That link redirects too many times.");
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Send a link." }, { status: 400 });
  }
  const raw = typeof body === "object" && body && "url" in body ? String(body.url) : "";
  const url = checkFetchUrl(raw);
  if (!url) {
    return Response.json(
      { error: "Ladle can only open public https:// links." },
      { status: 400 },
    );
  }

  try {
    const html = await fetchPage(url);
    const recipe = parseRecipePage(html);
    if (!recipe) {
      return Response.json(
        { error: "I couldn’t find an ingredient list on that page. Paste the ingredients instead." },
        { status: 422 },
      );
    }
    return Response.json(recipe);
  } catch (err) {
    if (err instanceof FetchProblem) return Response.json({ error: err.message }, { status: err.status });
    const code = (err as NodeJS.ErrnoException)?.code;
    const message =
      code === "EBLOCKED"
        ? "Ladle can only open public https:// links."
        : (err as Error)?.name === "TimeoutError" || (err as Error)?.name === "AbortError"
          ? "That page took too long to open. Paste the ingredients instead."
          : "Ladle couldn’t open that page. Paste the ingredients instead.";
    return Response.json({ error: message }, { status: code === "EBLOCKED" ? 400 : 502 });
  }
}
