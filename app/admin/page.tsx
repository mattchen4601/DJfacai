"use client";

import { useEffect, useState } from "react";
import { getDb } from "@/lib/cloudbase";
import { useRouter } from "next/navigation";
import { toDateText } from "@/lib/utils";

type UserDoc = {
  _id: string;
  username: string;
  password: string;
  role: "user" | "admin";
  balance: number;
  withdraw_count: number;
  withdraw_limit: number;
  can_withdraw: boolean;
  is_frozen: boolean;
};

type RequestDoc = {
  _id: string;
  user_id: string;
  username: string;
  type: "recharge" | "withdraw" | "sell_item";
  amount: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  remark?: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [requests, setRequests] = useState<RequestDoc[]>([]);
  const [msg, setMsg] = useState("");

  const ensureAdmin = async () => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("demo_user") : null;
    if (!raw) {
      router.push("/login");
      return;
    }
    const localUser = JSON.parse(raw);
    if (localUser.role !== "admin") {
      router.push("/user");
      return;
    }
  };

  const loadAll = async () => {
    const db = await getDb();
    if (!db) {
      setMsg("数据库初始化失败");
      return;
    }

    await ensureAdmin();
    const userRes = await db.collection("users").get();
    setUsers(userRes.data as UserDoc[]);

    const reqRes = await db.collection("requests").orderBy("created_at", "desc").get();
    setRequests(reqRes.data as RequestDoc[]);
  };

  useEffect(() => {
    loadAll().catch((err) => {
      console.error(err);
      setMsg("后台加载失败，请检查数据库权限或网络");
    });
  }, []);

  const updateUserField = async (id: string, patch: Partial<UserDoc>) => {
    const db = await getDb();
    if (!db) return;

    await db.collection("users").doc(id).update(patch);
    setMsg("已更新账户");
    await loadAll();
  };

  const approveRequest = async (item: RequestDoc) => {
    const db = await getDb();
    if (!db) return;

    await db.collection("requests").doc(item._id).update({
      status: "approved",
    });

    const userRes = await db.collection("users").doc(item.user_id).get();
    const user = userRes.data[0] as UserDoc;

    if (item.type === "recharge") {
      await db.collection("users").doc(item.user_id).update({
        balance: Number(user.balance || 0) + Number(item.amount || 0),
      });
    }

    if (item.type === "withdraw") {
      const nextCount = Number(user.withdraw_count || 0) + 1;
      await db.collection("users").doc(item.user_id).update({
        balance: Math.max(0, Number(user.balance || 0) - Number(item.amount || 0)),
        withdraw_count: nextCount,
        is_frozen: nextCount > 3 ? true : user.is_frozen,
      });
    }

    if (item.type === "sell_item" && item.remark) {
      await db.collection("inventory").doc(item.remark).update({
        status: "sold",
      });
      await db.collection("users").doc(item.user_id).update({
        balance: Number(user.balance || 0) + Number(item.amount || 0),
      });
    }

    setMsg("已批准申请");
    await loadAll();
  };

  const rejectRequest = async (item: RequestDoc) => {
    const db = await getDb();
    if (!db) return;

    await db.collection("requests").doc(item._id).update({
      status: "rejected",
    });

    if (item.type === "sell_item" && item.remark) {
      await db.collection("inventory").doc(item.remark).update({
        status: "sell_rejected",
      });
    }

    setMsg("已拒绝申请");
    await loadAll();
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("demo_user");
    }
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border bg-white p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="text-2xl font-bold">后台管理页</div>
          <button onClick={logout} className="rounded-2xl border px-4 py-2 text-sm">
            退出登录
          </button>
        </div>

        {msg ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {msg}
          </div>
        ) : null}

        <section className="rounded-3xl border bg-white p-6 shadow-sm space-y-4">
          <div className="text-xl font-semibold">申请列表</div>
          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="text-sm text-slate-500">暂无申请</div>
            ) : (
              requests.map((item) => (
                <div key={item._id} className="rounded-2xl border bg-slate-50 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">
                        {item.type === "recharge"
                          ? "充值申请"
                          : item.type === "withdraw"
                          ? "提现申请"
                          : "卖出申请"}
                      </div>
                      <div className="text-sm text-slate-600">账户：{item.username}</div>
                      <div className="text-sm text-slate-600">金额：¥{item.amount}</div>
                      <div className="text-xs text-slate-500">{toDateText(item.created_at)}</div>
                    </div>
                    <div className="text-sm">状态：{item.status}</div>
                  </div>
                  {item.status === "pending" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => approveRequest(item)} className="rounded-2xl border py-2.5">
                        批准
                      </button>
                      <button onClick={() => rejectRequest(item)} className="rounded-2xl bg-slate-900 py-2.5 text-white">
                        拒绝
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-6 shadow-sm space-y-4">
          <div className="text-xl font-semibold">账户控制</div>
          <div className="grid gap-4 xl:grid-cols-2">
            {users.map((u) => (
              <div key={u._id} className="rounded-2xl border bg-slate-50 p-4 space-y-3">
                <div className="font-semibold">{u.username}</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    className="rounded-2xl border px-3 py-2"
                    value={u.username}
                    onChange={(e) =>
                      setUsers((prev) =>
                        prev.map((x) => (x._id === u._id ? { ...x, username: e.target.value } : x))
                      )
                    }
                    onBlur={(e) => updateUserField(u._id, { username: e.target.value })}
                  />
                  <input
                    className="rounded-2xl border px-3 py-2"
                    value={u.password}
                    onChange={(e) =>
                      setUsers((prev) =>
                        prev.map((x) => (x._id === u._id ? { ...x, password: e.target.value } : x))
                      )
                    }
                    onBlur={(e) => updateUserField(u._id, { password: e.target.value })}
                  />
                  <input
                    type="number"
                    className="rounded-2xl border px-3 py-2"
                    value={u.balance}
                    onChange={(e) =>
                      setUsers((prev) =>
                        prev.map((x) => (x._id === u._id ? { ...x, balance: Number(e.target.value) } : x))
                      )
                    }
                    onBlur={(e) => updateUserField(u._id, { balance: Number(e.target.value) })}
                  />
                  <input
                    type="number"
                    className="rounded-2xl border px-3 py-2"
                    value={u.withdraw_count}
                    onChange={(e) =>
                      setUsers((prev) =>
                        prev.map((x) =>
                          x._id === u._id ? { ...x, withdraw_count: Number(e.target.value) } : x
                        )
                      )
                    }
                    onBlur={(e) => updateUserField(u._id, { withdraw_count: Number(e.target.value) })}
                  />
                  <input
                    type="number"
                    className="rounded-2xl border px-3 py-2 md:col-span-2"
                    value={u.withdraw_limit}
                    onChange={(e) =>
                      setUsers((prev) =>
                        prev.map((x) =>
                          x._id === u._id ? { ...x, withdraw_limit: Number(e.target.value) } : x
                        )
                      )
                    }
                    onBlur={(e) => updateUserField(u._id, { withdraw_limit: Number(e.target.value) })}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    onClick={() => updateUserField(u._id, { can_withdraw: !u.can_withdraw })}
                    className="rounded-2xl border px-4 py-2 text-sm"
                  >
                    提现权：{u.can_withdraw ? "允许" : "禁止"}
                  </button>
                  <button
                    onClick={() => updateUserField(u._id, { is_frozen: !u.is_frozen })}
                    className="rounded-2xl border px-4 py-2 text-sm"
                  >
                    状态：{u.is_frozen ? "冻结" : "正常"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
