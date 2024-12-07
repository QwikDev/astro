export function newHash() {
  const hash = Math.random().toString(26).split(".").pop();
  globalThis.hash = hash;
  return hash;
}
