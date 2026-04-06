import cloudbase from "@cloudbase/js-sdk";

const app = cloudbase.init({
  env: "tnt-dzyanvssa",
});

export const db = app.database();
