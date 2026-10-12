# BlueQuant

**一个面向 Sui 链 Bluefin DEX 的单区间集中流动性（CLMM）做市机器人。**

在选定池子上维持一个 CLMM 仓位，跟随价格移动；价格突破区间时自动平仓并重新居中，
每次重新开仓前先配平 A/B 两种资产的持仓比例。

![stars](https://img.shields.io/badge/stars-40-informational) ![language](https://img.shields.io/badge/TypeScript-5.7-3178c6)

---

## 它做什么

集中流动性（CLMM）的收益来源是**待在区间内**。这里的策略刻意做到最简：

1. 价格在区间内 → **持有，吃手续费**。
2. 价格突破上界或下界 → **平仓**，并记录突破方向。
3. 无仓位 → **重新计算区间**，必要时配平 A/B 持仓，然后**重新开仓**。

多区间资金分配、对冲、预言机信号等一律没做。故障模式是"仓位卡住"，这种情况下
简单比聪明更可靠。

---

## 架构

机器人在磁盘上**无状态**——每一轮循环都从链上读取重建全部状态，所以任何时刻崩溃都可以
直接重启。

```
                    ┌──────────────────────────────┐
                    │  run()   —— 无限循环          │
                    │  （间隔 10 秒）                │
                    └──────────────┬───────────────┘
                                   │
                          ┌────────▼────────┐
                          │     core()      │
                          └────────┬────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
   getUserPositions()          getPool()         按 pool_id 过滤
   （只保留本池子的仓位）  （tick / sqrtPrice /   （绝不触碰
              │              tickSpacing）        非目标池的仓位）
              │                    │
      ┌───────┴────────┐           │
      │ 没有仓位？      │           │
      └───────┬────────┘           │
              │                    │
      ┌───────▼────────────────────▼─────────────────────────┐
      │                   开仓路径                            │
      │                                                      │
      │  1. calG()                → 上次突破后的偏移量         │
      │  2. calTickIndex()        → 对齐到 tick_spacing       │
      │  3. calXY()               → 流动性 ⇄ (x, y)           │
      │  4. getAssert()           → 钱包 A/B/SUI 余额          │
      │  5. calSwap()             → 是否需要配平？             │
      │  6. toSwap()              → 执行配平 swap             │
      │  7. toAddLiquidity()      → openPositionWithFixedAmt  │
      └──────────────────────────────────────────────────────┘

      ┌──────────────────────────────────────────────────────┐
      │                  持有 / 平仓路径                       │
      │  current_tick ∈ [lower, upper]        → 持有          │
      │  current_tick <  lower  → 平仓，lastBreak = Down      │
      │  current_tick >  upper  → 平仓，lastBreak = Up        │
      └──────────────────────────────────────────────────────┘
```

### 区间选取与"突破偏移"机制

`calTickIndex` 把区间对齐到池子的 tick spacing：

```
lowerIndex = (floor(currentTick / tickSpacing) − g1) · tickSpacing
upperIndex = (floor(currentTick / tickSpacing) + g2) · tickSpacing
```

`(g1, g2)` 初始为 `(0, 1)`，即紧贴当前 tick 上方、宽度 1 个 tick spacing 的窄区间。
**只要发生过一次突破**，就切换为 `(1, 2)`，也就是 `[q−1, q+2]·tickSpacing`，
宽度 3 个 tick spacing、跨越当前价格。

这个"变宽"是整个策略唯一的自适应机制：它能避免在反复抽插的突破边缘反复开仓。

### 持仓配平（最有价值的一段）

开 CLMM 仓位要求 A、B 两种资产按特定比例投入。程序先根据流动性数学算出目标比例，
如果钱包当前比例偏离超过 `slip`，就先 swap 补足差额。

设目标比例 `k = x / y`，当前价格 `p`，钱包余额 `(a, b)`。求解让钱包精确落到比例 `k`
所需的 swap 输入量 `n`（忽略手续费与滑点）：

| 条件 | 动作 | 数量 |
|---|---|---|
| `b == 0` | A → B | `n = (a − b·k) / (1 + p·k)` |
| `k ≤ a/b ≤ (1+slip)·k` | 跳过 | `0` |
| `a/b > (1+slip)·k` | A → B | `n = (a − b·k) / (1 + p·k)` |
| `a/b < k` | B → A | `n = (b·k·p − a·p) / (1 + k·p)` |

分母 `(1 + p·k)` 是**对"swap 本身会推动价格"的修正**——这就是为什么朴素的
`n = a − b·k` 会超调。配平阶段的滑点容忍度是 10%；随后固定金额开仓用 5%。

### 仓位规模

`toAddLiquidity` 调用
`estLiquidityAndCoinAmountFromOneAmounts(lower, upper, amount, isCoinA=false, roundUp=true, slippage, sqrtPrice)`，
其中 `amount = 0.9 × balanceB` —— **B 侧余额的 90% 会被投入**，剩下 10% 留给 gas 和取整误差。

池子的 `current_sqrt_price` 在构造交易 payload **之前**会重新读一次，因为循环开头缓存的值
到这时可能已经过期。

---

## 关键工程决策

| 决策 | 理由 |
|---|---|
| **无状态循环，不落库** | 仓位和余额的唯一事实来源就是链上。任何本地缓存都是等着出问题的一致性 bug。重启即干净状态。 |
| **配平 swap 失败就放弃开仓** | 用不平衡的持仓开仓会静默产生一个畸形的仓位。宁可这一轮跳过，也不要开错。 |
| **swap 之后 sleep 1 秒再读余额** | fullnode 的读视图滞后于写入。不加这个延迟会拿到 swap 前的余额去开仓。 |
| **跳过任何 `pool_id` 不是本策略的仓位** | 钱包里可能有无关仓位，动它们就是破坏性操作。 |
| **跨轮状态只有一个枚举（`Unknown/Up/Down`）** | 策略需要的全部跨轮状态，其余都能推导出来。 |
| **`tick_spacing` 从池子读取，绝不硬编码** | 各池子不同（内置池子列表里就有 1 / 20 / 40 三种）。 |

---

## 运行

需要 Node.js，以及**稳定的非公共 RPC**——公共 Sui fullnode 会限流本循环每 10 秒发起的
`getAllBalances` / `getPool` 调用。

```bash
npm install
npm run build

# 或者用 make
make build
```

在项目根目录创建 `.env`：

```dotenv
# 钱包私钥——持有 LP 的账户。绝对不要提交到仓库。
PRIVATE_KEY="suiprivkey1..."

# Sui fullnode RPC。用自己的服务商，不要用公共节点。
ENDPPOINT="https://your-sui-rpc-endpoint"

# 目标 Bluefin CLMM 池子 id
POOL_ID="0x3b585786b13af1d8ea067ab37101b6513a05d2f90cfe60e8b1d9e1b46a63c4fa"

# 在基础区间之上额外增加的 tick spacing 偏移量。0 表示窄区间，
# 波动大时用更大的正整数来放宽区间。
G=0
```

```bash
make start          # npm install && tsc && node dist/index.js
make dev            # ts-node，不编译
```

> 注意：环境变量名拼写是 `ENDPPOINT`（不是 `ENDPOINT`），这是代码里实际读取的名字。

钱包里至少要有池子两种币中的**任意一种**非零余额。两种都是 0 时程序会在启动阶段退出。

### 选池子

`pools.json` 存的是 Bluefin 池子指标快照——`feeApr`、`rewardApr`、`volume`、
`priceMin`/`priceMax`、`tickSpacing`——用于挑选目标池。
`src/config.ts` 里放了 Bluefin 主网合约地址，以及 8 个池子（wUSDC-USDC、haSUI-SUI、
USDT-USDC、SUI-USDC ×2、ETH-USDC、WBTC-USDC、DEEP-SUI）。

> 上游 README 自己给的建议是对的：**选池子比调策略更重要**，
> 并且奖励 APR 低于手续费成本时，这个池子不值得跑。

---

## 技术栈

```
语言        TypeScript 5.7（开发期用 ts-node）
DEX SDK     @firefly-exchange/library-sui 2.4.21
            （Bluefin CLMM：OnChainCalls、QueryChain、ClmmPoolUtil、TickMath）
数学        bn.js（价格路径上全部用整数 sqrt-price 运算，不用浮点）
日志        pino + pino-pretty
运行时      Node.js、dotenv、Makefile
```

---

## 局限与后续

明确写出它**不做**什么：

- **单仓位、单区间。** 没有多区间资金分配，没有区间平移网格。
- **没有盈亏核算。** 不计算手续费收入与无常损失的对比；是否重新入场只看 tick 位置，
  从不看盈利性。
- **没有止损，也没有熔断**，除了配平 swap 失败时放弃开仓这一条。
- **没有预言机输入。** 区间宽度是静态常量（`G`），不随波动率自适应。
- **10 秒轮询循环。** 对延迟不敏感，不适合竞争性场景。
- **没有测试。** 配平数学是纯函数，非常容易单测——这是最该补的第一件事。
- **没有 LICENSE 文件。** （建议补 MIT / Apache-2.0。没有 License，别人就只能看，不能用。）

---

## 支持作者

如果这个项目对你有帮助，作者接受 Sui 打赏：

`0x08df1fce2d12eb4cee60c7e8cc341e65e7121b2419e1ff4025d3c124f83235dd`

问题咨询 / Discord：`matrix.ye`
