"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/cloudbase";
import { useRouter } from "next/navigation";

type UserDoc = {
  _id: string;
  username: string;
  role: "user" | "admin";
  password: string;
  balance: number;
  withdraw_count: number;
  withdraw_limit: number;
  can_withdraw: boolean;
  is_frozen: boolean;
};

type ProductDoc = {
  _id: string;
  name: string;
  price: number;
  image_url: string;
  is_active: boolean;
};

type InventoryDoc = {
  _id: string;
  user_id: string;
  username: string;
  product_id: string;
  product_name: string;
  buy_price: number;
  image_url: string;
  status: "holding" | "sell_pending" | "sold" | "sell_rejected";
  created_at: string;
};

export default function UserPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserDoc | null>(null);
  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [inventory, setInventory] = useState<InventoryDoc[]>([]);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [showRechargeImage, setShowRechargeImage] = useState(false);

  const loadUserAndData = async () => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("demo_user") : null;
    if (!raw) {
      router.push("/login");
      return;
    }
    const localUser = JSON.parse(raw);
    if (localUser.role === "admin") {
      router.push("/admin");
      return;
    }

    const userRes = await db.collection("users").doc(localUser._id).get();
    const freshUser = userRes.data[0] as UserDoc;
    setCurrentUser(freshUser);

    if (typeof window !== "undefined") {
      localStorage.setItem("demo_user", JSON.stringify(freshUser));
    }

    const productRes = await db.collection("products").where({ is_active: true }).get();
    setProducts(productRes.data as ProductDoc[]);

    const invRes = await db
      .collection("inventory")
      .where({
        user_id: freshUser._id,
      })
      .get();
    setInventory(invRes.data as InventoryDoc[]);
  };

  useEffect(() => {
    loadUserAndData().catch((err) => {
      console.error(err);
      setMessage("加载失败，请检查数据库权限或网络");
    });
  }, []);

  const refresh = async () => {
    await loadUserAndData();
  };

  const submitRecharge = async () => {
    if (!currentUser) return;
    const money = Number(amount);
    if (!money || money <= 0) {
      setMessage("请输入有效金额");
      return;
    }

    await db.collection("requests").add({
      user_id: currentUser._id,
      username: currentUser.username,
      type: "recharge",
      amount: money,
      status: "pending",
      created_at: new Date().toISOString(),
      remark: "",
    });

    setShowRechargeImage(true);
    setAmount("");
    setMessage("需求已提交（嘻嘻，我在后台看着呢）");
  };

  const submitWithdraw = async () => {
    if (!currentUser) return;
    const money = Number(amount);
    if (!money || money <= 0) {
      setMessage("请输入有效金额");
      return;
    }
    if (currentUser.is_frozen) {
      setMessage("当前账户已冻结");
      return;
    }
    if (!currentUser.can_withdraw) {
      setMessage("后台管理员不允许提现");
      return;
    }
    if (money > currentUser.withdraw_limit) {
      setMessage(`单次提现不能超过 ${currentUser.withdraw_limit}`);
      return;
    }

    await db.collection("requests").add({
      user_id: currentUser._id,
      username: currentUser.username,
      type: "withdraw",
      amount: money,
      status: "pending",
      created_at: new Date().toISOString(),
      remark: "",
    });

    setAmount("");
    setMessage("需求已提交（嘻嘻，我在后台看着呢）");
  };

  const buyProduct = async (product: ProductDoc) => {
    if (!currentUser) return;
    if (currentUser.balance < product.price) {
      setMessage("余额不足");
      return;
    }

    await db.collection("users").doc(currentUser._id).update({
      balance: currentUser.balance - product.price,
    });

    await db.collection("inventory").add({
      user_id: currentUser._id,
      username: currentUser.username,
      product_id: product._id,
      product_name: product.name,
      buy_price: product.price,
      image_url: product.image_url,
      status: "holding",
      created_at: new Date().toISOString(),
    });

    setMessage("买入成功，已进入仓库");
    await refresh();
  };

  const submitSellRequest = async (item: InventoryDoc) => {
    if (!currentUser) return;

    await db.collection("inventory").doc(item._id).update({
      status: "sell_pending",
    });

    await db.collection("requests").add({
      user_id: currentUser._id,
      username: currentUser.username,
      type: "sell_item",
      amount: item.buy_price,
      status: "pending",
      created_at: new Date().toISOString(),
      remark: item._id,
    });

    setMessage("卖出需求已提交（嘻嘻，我在后台看着呢）");
    await refresh();
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("demo_user");
    }
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-900 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/hqu-logo.png" alt="logo" className="h-12 w-auto object-contain md:h-16" />
              <div className="text-xl md:text-3xl font-bold leading-tight">
                厦门华侨大学陈广玮给妈妈的资金安全提醒平台
              </div>
            </div>
            <button onClick={logout} className="rounded-2xl border bg-white px-4 py-2 text-sm">
              退出登录
            </button>
          </div>
        </div>

        {currentUser ? (
          <>
            <div className="grid gap-4 md:grid-cols-5">
              <Card title="当前用户" value={currentUser.username} />
              <Card title="余额" value={`¥${currentUser.balance ?? 0}`} />
              <Card title="提现次数" value={String(currentUser.withdraw_count ?? 0)} />
              <Card title="单次提现额度" value={`¥${currentUser.withdraw_limit ?? 0}`} />
              <Card title="状态" value={currentUser.is_frozen ? "已冻结" : "正常"} />
            </div>

            <section className="rounded-3xl border bg-white p-6 shadow-sm space-y-4">
              <div className="text-xl font-semibold">操作区</div>
              <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
                <input
                  className="rounded-2xl border px-3 py-2"
                  placeholder="输入金额"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <button onClick={submitRecharge} className="rounded-2xl border px-5 py-2.5">
                  充值
                </button>
                <button onClick={submitWithdraw} className="rounded-2xl bg-slate-900 px-5 py-2.5 text-white">
                  提现
                </button>
              </div>
              {message ? <div className="text-sm text-amber-800">{message}</div> : null}
            </section>

            {showRechargeImage ? (
              <section className="rounded-3xl border bg-white p-6 shadow-sm space-y-4">
                <div className="text-xl font-semibold">充值图片</div>
                <img src="/recharge-qr.jpg" alt="充值图片" className="max-w-full rounded-2xl border" />
              </section>
            ) : null}

            <section className="rounded-3xl border bg-white p-6 shadow-sm space-y-4">
              <div className="text-xl font-semibold">风险案例商品区</div>
              <div className="grid gap-4 md:grid-cols-2">
                {products.map((item) => (
                  <div key={item._id} className="rounded-2xl border bg-slate-50 p-4 space-y-3">
                    <img
                      src={item.image_url || "/art.jpg"}
                      alt={item.name}
                      className="h-52 w-full rounded-2xl border object-cover"
                    />
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-sm text-slate-600">价格：¥{item.price}</div>
                    <button
                      onClick={() => buyProduct(item)}
                      className="rounded-2xl bg-slate-900 px-4 py-2 text-white"
                    >
                      买入
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm space-y-4">
              <div className="text-xl font-semibold">仓库</div>
              <div className="grid gap-4 md:grid-cols-2">
                {inventory.length === 0 ? (
                  <div className="text-sm text-slate-500">当前仓库为空</div>
                ) : (
                  inventory.map((item) => (
                    <div key={item._id} className="rounded-2xl border bg-slate-50 p-4 space-y-3">
                      <img
                        src={item.image_url || "/art.jpg"}
                        alt={item.product_name}
                        className="h-52 w-full rounded-2xl border object-cover"
                      />
                      <div className="font-semibold">{item.product_name}</div>
                      <div className="text-sm text-slate-600">买入价：¥{item.buy_price}</div>
                      <div className="text-sm text-slate-600">状态：{item.status}</div>
                      {item.status === "holding" || item.status === "sell_rejected" ? (
                        <button
                          onClick={() => submitSellRequest(item)}
                          className="rounded-2xl border px-4 py-2"
                        >
                          申请卖出
                        </button>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        ) : (
          <div className="rounded-3xl border bg-white p-8 shadow-sm">加载中...</div>
        )}
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
