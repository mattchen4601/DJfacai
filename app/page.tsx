\"use client\";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Lock,
  Wallet,
  LogIn,
  Shield,
  UserPlus,
  CreditCard,
  Banknote,
  Eye,
  Pencil,
} from "lucide-react";

type RequestItem = {
  id: number;
  type: "recharge" | "withdraw";
  username: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

type Account = {
  id: number;
  username: string;
  password: string;
  balance: number;
  withdrawCount: number;
  withdrawLimit: number;
  canWithdraw: boolean;
  isFrozen: boolean;
  qrImage: string;
};

const initialAccounts: Account[] = [
  {
    id: 1,
    username: "demo1",
    password: "123456",
    balance: 100,
    withdrawCount: 0,
    withdrawLimit: 10,
    canWithdraw: true,
    isFrozen: false,
    qrImage: "/recharge-qr.jpg",
  },
];

const initialTexts = {
  pageHeader: "厦门华侨大学陈广玮给妈妈的发财平台",
  siteTitle: "家人防骗提醒",
  siteNotice:
    "请勿向陌生平台转账。所有金额和账户状态都可能被后台随意改动，本页仅用于帮助家人识别高风险充值提现套路。",
  userPanelTitle: "用户主页",
  rechargeHint: "输入金额后点击确认，页面会显示“申请已发送”，后台会同步看到充值申请。",
  withdrawHint: "输入金额后点击确认，页面会显示“申请已发送”，后台会同步看到提现申请。",
  footerMessage: "本页面仅供家庭反诈提醒，不提供真实充值、真实提现或真实收益。",
};

const nowText = () => new Date().toLocaleString("zh-CN");

export default function Page() {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loginForm, setLoginForm] = useState({ username: "demo1", password: "123456" });

  const [adminUsername, setAdminUsername] = useState("cgw");
  const [adminPassword, setAdminPassword] = useState("123");
  const [adminLogin, setAdminLogin] = useState({ username: "cgw", password: "123" });
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  const [message, setMessage] = useState("这是一个家庭反诈提醒页面，所有金额均为虚拟数据。");
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("10");
  const [texts, setTexts] = useState(initialTexts);
  const [activeView, setActiveView] = useState<"combined" | "user" | "admin">("combined");

  const currentUser = useMemo(
    () => accounts.find((a) => a.id === currentUserId) || null,
    [accounts, currentUserId]
  );

  const updateAccount = (id: number, patch: Partial<Account>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const addRequest = (type: "recharge" | "withdraw", username: string, amount: number) => {
    const nextId = requests.length ? Math.max(...requests.map((r) => r.id)) + 1 : 1;
    setRequests((prev) => [
      {
        id: nextId,
        type,
        username,
        amount,
        status: "pending",
        createdAt: nowText(),
      },
      ...prev,
    ]);
  };

  const handleUserLogin = () => {
    const user = accounts.find(
      (a) => a.username === loginForm.username && a.password === loginForm.password
    );
    if (!user) {
      setMessage("登录失败：账号或密码错误。");
      return;
    }
    setCurrentUserId(user.id);
    setMessage("登录成功。你提交的充值和提现申请都会进入后台列表。");
  };

  const handleAdminLogin = () => {
    if (adminLogin.username === adminUsername && adminLogin.password === adminPassword) {
      setAdminUnlocked(true);
      setMessage("后台已解锁。现在可以查看并处理充值/提现申请。");
    } else {
      setMessage("管理员账号或密码错误。");
    }
  };

  const handleRechargeRequest = () => {
    if (!currentUser) return;
    const amount = Number(rechargeAmount);
    if (!amount || amount <= 0) {
      setMessage("请输入有效的充值金额。");
      return;
    }
    addRequest("recharge", currentUser.username, amount);
    setShowRechargeModal(false);
    setShowImageModal(true);
    setMessage("申请已发送");
  };

  const handleWithdrawRequest = () => {
    if (!currentUser) return;
    if (currentUser.isFrozen) {
      setMessage("当前账户已冻结。");
      return;
    }
    if (!currentUser.canWithdraw) {
      setMessage("当前账户没有提现权限。");
      return;
    }

    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      setMessage("请输入有效的提现金额。");
      return;
    }
    if (amount > currentUser.withdrawLimit) {
      setMessage(`单次提现额度不能超过 ${currentUser.withdrawLimit} 元。`);
      return;
    }

    addRequest("withdraw", currentUser.username, amount);
    setShowWithdrawModal(false);
    setMessage("申请已发送");
  };

  const applyRequest = (req: RequestItem, action: "approved" | "rejected") => {
    setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: action } : r)));

    const target = accounts.find((a) => a.username === req.username);
    if (!target) return;

    if (action === "approved") {
      if (req.type === "recharge") {
        updateAccount(target.id, { balance: target.balance + req.amount });
        setMessage(`已批准 ${req.username} 的充值申请 ${req.amount} 元。`);
      } else {
        const nextCount = target.withdrawCount + 1;
        updateAccount(target.id, {
          balance: Math.max(0, target.balance - req.amount),
          withdrawCount: nextCount,
          isFrozen: nextCount > 3 ? true : target.isFrozen,
        });
        setMessage(`已批准 ${req.username} 的提现申请 ${req.amount} 元。`);
      }
    } else {
      setMessage(`已拒绝 ${req.username} 的${req.type === "recharge" ? "充值" : "提现"}申请。`);
    }
  };

  const addAccount = () => {
    if (accounts.length >= 2) {
      setMessage("最多只保留 2 个账户。");
      return;
    }
    const nextId = Math.max(...accounts.map((a) => a.id)) + 1;
    setAccounts((prev) => [
      ...prev,
      {
        id: nextId,
        username: `demo${nextId}`,
        password: "123456",
        balance: 100,
        withdrawCount: 0,
        withdrawLimit: 10,
        canWithdraw: true,
        isFrozen: false,
        qrImage: "/recharge-qr.jpg",
      },
    ]);
    setMessage("已新增账户。");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-900 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/hqu-logo.png" alt="logo" className="h-12 w-auto object-contain md:h-16" />
              <div className="text-xl font-bold leading-tight md:text-3xl">{texts.pageHeader}</div>
            </div>

            <div className="flex items-start gap-3 max-w-3xl">
              <AlertTriangle className="mt-0.5 h-6 w-6" />
              <div>
                <div className="text-lg font-bold">{texts.siteTitle}</div>
                <div className="mt-1 text-sm">{texts.siteNotice}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => setActiveView("combined")} className="rounded-2xl border bg-white px-4 py-2 text-sm">双界面</button>
              <button onClick={() => setActiveView("user")} className="rounded-2xl border bg-white px-4 py-2 text-sm">仅用户页</button>
              <button onClick={() => setActiveView("admin")} className="rounded-2xl border bg-white px-4 py-2 text-sm">仅后台页</button>
            </div>
          </div>
        </div>

        {(activeView === "combined" || activeView === "user") && (
          <div className="grid gap-6 lg:grid-cols-3">
            <section className="space-y-4 rounded-3xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                <h2 className="text-xl font-semibold">用户登录</h2>
              </div>
              <div>
                <label className="text-sm font-medium">账号</label>
                <input
                  className="mt-1 w-full rounded-2xl border px-3 py-2"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">密码</label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-2xl border px-3 py-2"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                />
              </div>
              <button onClick={handleUserLogin} className="w-full rounded-2xl bg-slate-900 py-2.5 font-medium text-white">
                登录
              </button>

              <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-700">
                当前可用账户：
                <div className="mt-2 space-y-1">
                  {accounts.map((a) => (
                    <div key={a.id}>
                      账号：<span className="font-semibold">{a.username}</span> / 密码：
                      <span className="font-semibold">{a.password}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-3xl border bg-white p-6 shadow-sm lg:col-span-2">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                <h2 className="text-xl font-semibold">{texts.userPanelTitle}</h2>
              </div>

              {currentUser ? (
                <>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border bg-slate-50 p-4">
                      <div className="text-sm text-slate-500">余额</div>
                      <div className="mt-1 text-3xl font-bold">¥{currentUser.balance.toFixed(2)}</div>
                    </div>
                    <div className="rounded-2xl border bg-slate-50 p-4">
                      <div className="text-sm text-slate-500">提现次数</div>
                      <div className="mt-1 text-3xl font-bold">{currentUser.withdrawCount}</div>
                    </div>
                    <div className="rounded-2xl border bg-slate-50 p-4">
                      <div className="text-sm text-slate-500">单次额度</div>
                      <div className="mt-1 text-2xl font-bold">¥{currentUser.withdrawLimit}</div>
                    </div>
                    <div className="rounded-2xl border bg-slate-50 p-4">
                      <div className="text-sm text-slate-500">状态</div>
                      <div className="mt-1 flex items-center gap-2 text-2xl font-bold">
                        {currentUser.isFrozen ? <Lock className="h-5 w-5" /> : null}
                        {currentUser.isFrozen ? "已冻结" : "正常"}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <button onClick={() => setShowRechargeModal(true)} className="flex items-center justify-center gap-2 rounded-2xl border py-3 font-medium">
                      <CreditCard className="h-4 w-4" /> 充值
                    </button>
                    <button onClick={() => setShowWithdrawModal(true)} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 font-medium text-white">
                      <Banknote className="h-4 w-4" /> 提现
                    </button>
                  </div>

                  <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <div>{texts.rechargeHint}</div>
                    <div>{texts.withdrawHint}</div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border bg-slate-50 p-8 text-center text-slate-600">请先登录一个账户。</div>
              )}
            </section>
          </div>
        )}

        {(activeView === "combined" || activeView === "admin") && (
          <section className="space-y-6 rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <h2 className="text-xl font-semibold">后台管理页</h2>
            </div>

            {!adminUnlocked ? (
              <div className="grid max-w-2xl gap-3 md:grid-cols-3">
                <input
                  className="rounded-2xl border px-3 py-2"
                  placeholder="管理员账号"
                  value={adminLogin.username}
                  onChange={(e) => setAdminLogin({ ...adminLogin, username: e.target.value })}
                />
                <input
                  type="password"
                  className="rounded-2xl border px-3 py-2"
                  placeholder="管理员密码"
                  value={adminLogin.password}
                  onChange={(e) => setAdminLogin({ ...adminLogin, password: e.target.value })}
                />
                <button onClick={handleAdminLogin} className="rounded-2xl bg-slate-900 px-5 py-2 text-white">
                  进入后台
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="space-y-4 rounded-3xl border bg-slate-50 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg font-bold">操作申请列表</div>
                      <div className="text-sm text-slate-500">充值和提现申请会出现在这里</div>
                    </div>

                    <div className="max-h-[520px] space-y-3 overflow-auto pr-1">
                      {requests.length === 0 ? (
                        <div className="rounded-2xl border bg-white p-4 text-sm text-slate-500">暂时没有申请。</div>
                      ) : (
                        requests.map((req) => (
                          <div key={req.id} className="space-y-3 rounded-2xl border bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-semibold">{req.type === "recharge" ? "充值申请" : "提现申请"}</div>
                                <div className="text-sm text-slate-600">账户：{req.username}</div>
                                <div className="text-sm text-slate-600">金额：¥{req.amount}</div>
                                <div className="mt-1 text-xs text-slate-500">{req.createdAt}</div>
                              </div>
                              <div className="text-sm">
                                {req.status === "pending" ? "待处理" : req.status === "approved" ? "已批准" : "已拒绝"}
                              </div>
                            </div>

                            {req.status === "pending" && (
                              <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => applyRequest(req, "approved")} className="rounded-2xl border py-2.5">批准</button>
                                <button onClick={() => applyRequest(req, "rejected")} className="rounded-2xl bg-slate-900 py-2.5 text-white">拒绝</button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4 rounded-3xl border bg-slate-50 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-lg font-bold">账户控制</div>
                        <button onClick={addAccount} className="flex items-center gap-2 rounded-2xl border bg-white px-4 py-2 text-sm">
                          <UserPlus className="h-4 w-4" /> 添加账户
                        </button>
                      </div>

                      <div className="space-y-4">
                        {accounts.map((a) => (
                          <div key={a.id} className="space-y-3 rounded-2xl border bg-white p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-semibold">{a.username}</div>
                                <div className="text-sm text-slate-500">余额：¥{a.balance.toFixed(2)}</div>
                              </div>
                              <button onClick={() => setCurrentUserId(a.id)} className="rounded-2xl border px-3 py-2 text-sm">
                                切换查看
                              </button>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                              <input className="rounded-2xl border px-3 py-2" value={a.username} onChange={(e) => updateAccount(a.id, { username: e.target.value })} />
                              <input className="rounded-2xl border px-3 py-2" value={a.password} onChange={(e) => updateAccount(a.id, { password: e.target.value })} />
                              <input type="number" className="rounded-2xl border px-3 py-2" value={a.balance} onChange={(e) => updateAccount(a.id, { balance: Number(e.target.value) })} />
                              <input type="number" className="rounded-2xl border px-3 py-2" value={a.withdrawCount} onChange={(e) => updateAccount(a.id, { withdrawCount: Number(e.target.value) })} />
                              <input type="number" className="rounded-2xl border px-3 py-2 md:col-span-2" value={a.withdrawLimit} onChange={(e) => updateAccount(a.id, { withdrawLimit: Number(e.target.value) })} />
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                              <button onClick={() => updateAccount(a.id, { canWithdraw: !a.canWithdraw })} className="rounded-2xl border px-3 py-2 text-sm">
                                提现权：{a.canWithdraw ? "允许" : "禁止"}
                              </button>
                              <button onClick={() => updateAccount(a.id, { isFrozen: !a.isFrozen })} className="rounded-2xl border px-3 py-2 text-sm">
                                状态：{a.isFrozen ? "冻结" : "正常"}
                              </button>
                              <button
                                onClick={() =>
                                  updateAccount(a.id, {
                                    balance: 100,
                                    withdrawCount: 0,
                                    withdrawLimit: 10,
                                    canWithdraw: true,
                                    isFrozen: false,
                                  })
                                }
                                className="rounded-2xl border px-3 py-2 text-sm"
                              >
                                重置数据
                              </button>
                            </div>

                            <input
                              className="w-full rounded-2xl border px-3 py-2"
                              value={a.qrImage}
                              onChange={(e) => updateAccount(a.id, { qrImage: e.target.value })}
                              placeholder="充值后展示的图片地址"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 rounded-3xl border bg-slate-50 p-5">
                      <div className="flex items-center gap-2 text-lg font-bold">
                        <Pencil className="h-5 w-5" /> 自定义页面内容
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <input className="rounded-2xl border px-3 py-2" value={texts.pageHeader} onChange={(e) => setTexts({ ...texts, pageHeader: e.target.value })} placeholder="顶部主标题" />
                        <input className="rounded-2xl border px-3 py-2" value={texts.userPanelTitle} onChange={(e) => setTexts({ ...texts, userPanelTitle: e.target.value })} placeholder="用户页标题" />
                      </div>
                      <textarea className="min-h-[80px] w-full rounded-2xl border px-3 py-2" value={texts.siteNotice} onChange={(e) => setTexts({ ...texts, siteNotice: e.target.value })} />
                      <textarea className="min-h-[70px] w-full rounded-2xl border px-3 py-2" value={texts.rechargeHint} onChange={(e) => setTexts({ ...texts, rechargeHint: e.target.value })} />
                      <textarea className="min-h-[70px] w-full rounded-2xl border px-3 py-2" value={texts.withdrawHint} onChange={(e) => setTexts({ ...texts, withdrawHint: e.target.value })} />
                      <textarea className="min-h-[70px] w-full rounded-2xl border px-3 py-2" value={texts.footerMessage} onChange={(e) => setTexts({ ...texts, footerMessage: e.target.value })} />
                      <div className="grid gap-3 md:grid-cols-2">
                        <input className="rounded-2xl border px-3 py-2" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} placeholder="管理员账号" />
                        <input className="rounded-2xl border px-3 py-2" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="管理员密码" />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        <section className="space-y-2 rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
          <div className="flex items-center gap-2 font-semibold">
            <Eye className="h-4 w-4" /> 页面提示
          </div>
          <div className="text-sm text-slate-200">{message}</div>
          <div className="text-xs text-slate-400">{texts.footerMessage}</div>
        </section>
      </div>

      {showRechargeModal && currentUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="text-xl font-semibold">提交充值申请</div>
            <input
              type="number"
              className="w-full rounded-2xl border px-3 py-2"
              placeholder="例如 100"
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowRechargeModal(false)} className="rounded-2xl border py-2.5">取消</button>
              <button onClick={handleRechargeRequest} className="rounded-2xl bg-slate-900 py-2.5 text-white">确认</button>
            </div>
          </div>
        </div>
      )}

      {showWithdrawModal && currentUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="text-xl font-semibold">提交提现申请</div>
            <input
              type="number"
              className="w-full rounded-2xl border px-3 py-2"
              placeholder={`例如 ${currentUser.withdrawLimit}`}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowWithdrawModal(false)} className="rounded-2xl border py-2.5">取消</button>
              <button onClick={handleWithdrawRequest} className="rounded-2xl bg-slate-900 py-2.5 text-white">确认</button>
            </div>
          </div>
        </div>
      )}

      {showImageModal && currentUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="text-xl font-semibold">充值图片</div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              请不要向陌生平台转账。扫码、转账、审核到账这类流程都需要提高警惕。
            </div>
            <img src={currentUser.qrImage} alt="充值图片" className="h-auto w-full rounded-2xl border object-contain" />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setShowImageModal(false); setRechargeAmount(""); }} className="rounded-2xl border py-2.5">关闭</button>
              <button
                onClick={() => {
                  setShowImageModal(false);
                  setRechargeAmount("");
                  setMessage("申请已发送");
                }}
                className="rounded-2xl bg-slate-900 py-2.5 text-white"
              >
                继续
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
