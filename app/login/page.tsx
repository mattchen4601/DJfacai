"use client";

import { useState } from "react";
import { db } from "@/lib/cloudbase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleLogin = async () => {
    setMsg("");
    if (!username || !password) {
      setMsg("请输入账号和密码");
      return;
    }

    try {
      const res = await db
        .collection("users")
        .where({
          username,
          password,
        })
        .get();

      if (!res.data.length) {
        setMsg("账号或密码错误");
        return;
      }

      const user = res.data[0];

      if (typeof window !== "undefined") {
        localStorage.setItem("demo_user", JSON.stringify(user));
      }

      if (user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/user");
      }
    } catch (err) {
      console.error(err);
      setMsg("登录失败，请检查 CloudBase 权限或网络");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/hqu-logo.png" alt="logo" className="h-12 w-auto object-contain md:h-16" />
          <div className="text-2xl md:text-3xl font-bold leading-tight">
            厦门华侨大学陈广玮给妈妈的资金安全提醒平台
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          请勿向陌生平台转账。本页用于帮助家人识别高风险充值、提现和后台控制套路。
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">账号</label>
            <input
              className="mt-1 w-full rounded-2xl border px-3 py-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入账号"
            />
          </div>
          <div>
            <label className="text-sm font-medium">密码</label>
            <input
              type="password"
              className="mt-1 w-full rounded-2xl border px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
            />
          </div>
          <button
            onClick={handleLogin}
            className="w-full rounded-2xl bg-slate-900 py-3 text-white font-medium"
          >
            登录
          </button>

          {msg ? <div className="text-sm text-rose-700">{msg}</div> : null}

          <div className="rounded-2xl bg-slate-50 border p-4 text-sm text-slate-700 space-y-1">
            <div>管理员：cgw / 123</div>
            <div>测试用户：demo1 / 123456</div>
            <div>测试用户：demo2 / 123456</div>
          </div>
        </div>
      </div>
    </div>
  );
}
