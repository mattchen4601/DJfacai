"use client";

import cloudbase from "@cloudbase/js-sdk";

let db: any = null;

if (typeof window !== "undefined") {
  const app = cloudbase.init({
    env: "tnt-dzyanvssa",
  });
  db = app.database();
}

export { db };
