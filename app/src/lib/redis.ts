import Redis from "ioredis";

let _pub: Redis | null = null;
let _sub: Redis | null = null;

function url() {
  return process.env.REDIS_URL || "redis://redis:6379/0";
}

export function getPub() {
  if (_pub) return _pub;
  _pub = new Redis(url());
  return _pub;
}

export function getSub() {
  // New subscriber per caller; SSE handlers close it
  return new Redis(url());
}

export async function publish(channel: string, payload: unknown) {
  await getPub().publish(channel, JSON.stringify(payload));
}
