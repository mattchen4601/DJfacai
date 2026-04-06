"use client";

let cachedDb: any = null;

export async function getDb() {
  if (cachedDb) return cachedDb;

  if (typeof window === "undefined") {
    return null;
  }

  const cloudbase = (await import("@cloudbase/js-sdk")).default;

  const app = cloudbase.init({
    env: "tnt-dzyanvssa",
  });

  cachedDb = app.database();
  return cachedDb;
}
