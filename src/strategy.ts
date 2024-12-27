// noinspection PointlessBooleanExpressionJS,PointlessArithmeticExpressionJS

/**
 * 文件名: strategy.ts
 * 创建时间: 2024/12/17 18:10
 * 作者: yepeng
 * 描述:
 */
import {IPosition, ISwapParams, OnChainCalls, QueryChain} from "@firefly-exchange/library-sui/dist/src/spot";
import {Ed25519Keypair, SuiClient, toBigNumber, toBigNumberStr} from "@firefly-exchange/library-sui";

import {mainnet} from "./config";
import {ClmmPoolUtil, TickMath} from "@firefly-exchange/library-sui/dist/src/spot/clmm";
import {BN} from "bn.js";
import {logger} from "./mylog";
import {calTickIndex, coinTypeToName, scalingDown, stringToDividedNumber} from "./utils";
import {COIN_SUI, DECIMALS_SUI} from "./constant";
import {Pool} from "@firefly-exchange/library-sui/dist/src/spot/types";
import {OnChainCallResponse} from "@firefly-exchange/library-sui/dist/src/types";

enum BreakType {
    Unknown,
    Up,
    Down,
}

// 策略
export class Strategy {
    client: SuiClient
    keyPair: Ed25519Keypair;
    walletAddress: string
    poolId: string
    private coinA: string | null = "unknown";// 代币A 类型
    private coinB: string | null = "unknown"; // 代币B 类型
    private decimalsA: number = 6; // 代币A精度
    private decimalsB: number = 6; //代币B 精度
    // CLMM Tick Spacing
    private tick_spacing: number = 60;
    private nameA: string = "unknowns";
    private nameB: string = "unknowns";
    private lastBreak = BreakType.Unknown
    private readonly G: number = 0;


    constructor(endpoint: string, privateKey: string, poolId: string, g: number) {
        this.poolId = poolId;
        this.client = new SuiClient({url: endpoint});
        this.G = g
        logger.info(`privateKey: ${privateKey}`);
        if (privateKey.startsWith("suiprivkey")) {
            this.keyPair = Ed25519Keypair.fromSecretKey(privateKey);
        } else {
            this.keyPair = Ed25519Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'));
        }
        this.walletAddress = this.keyPair.toSuiAddress();
        logger.info(`walletAddress:${this.walletAddress}`);
    }

    // 获取池子信息
    async getPool(poolID: string) {
        let qc = new QueryChain(this.client);
        return await qc.getPool(poolID).catch(e => {
            logger.error(`${e}`);
            return null;
        });
    }

    async getAssert(): Promise<number[] | null> {
        let amountA: number = 0.0;
        let amountB: number = 0.0;
        let amountSUI: number = 0.0;
        try {
            const balances = await this.client.getAllBalances({owner: this.walletAddress});

            for (const balance of balances) {
                if (balance.coinType === this.coinA) {
                    amountA = stringToDividedNumber(balance.totalBalance, this.decimalsA);
                }

                if (balance.coinType === this.coinB) {
                    amountB = stringToDividedNumber(balance.totalBalance, this.decimalsB);
                }

                if (balance.coinType === COIN_SUI) {
                    amountSUI = stringToDividedNumber(balance.totalBalance, DECIMALS_SUI);
                }
            }
        } catch (e) {
            return null;
        }
        return [amountA, amountB, amountSUI];

    }

    // 获取用户仓位列表
    async getUserPositions(userAddress: string) {
        let qc = new QueryChain(this.client);
        return await qc.getUserPositions(mainnet.BasePackage, userAddress).catch(e => {
            logger.error(e);
            return null;
        });
    }

    /***
     * 系统初始化
     */
    async initSys() {
        const pool = await this.getPool(this.poolId)
        if (!pool) {
            throw new Error(`无效的池子地址: ${this.poolId}`);
        }

        this.coinA = pool.coin_a.address;
        this.coinB = pool.coin_b.address;

        this.decimalsA = pool.coin_a.decimals;
        this.decimalsB = pool.coin_b.decimals;

        this.tick_spacing = pool.ticks_manager.tick_spacing;
        const nameA = coinTypeToName(this.coinA);
        const nameB = coinTypeToName(this.coinB)
        this.nameA = nameA;
        this.nameB = nameB;
        logger.info(`poolId ${this.poolId}`);
        logger.info(`coinA: ${nameA} decimalsA: ${this.decimalsA}`);
        logger.info(`coinB:  ${nameB} decimalsB: ${this.decimalsB}`);
        logger.info(`tick_spacing ${this.tick_spacing}`);
        logger.info(`G ${this.G}`);
        if (isNaN(this.G)) {
            throw Error(`错误的启动参数G,必须为大于等于0的正整数`);
        }
        const result = await this.getAssert()
        if (result === null) {
            throw Error(`获取资金信息fail`)
        }
        const [balanceA, balanceB, balanceSUI] = result;
        logger.info(`BalanceA: ${balanceA} ${nameA}`);
        logger.info(`BalanceB: ${balanceB} ${nameB}`);
        logger.info(`GasPay: ${balanceSUI} SUI`);
        if (balanceA <= 0 && balanceB <= 0) {
            throw Error(`余额不足，至少需要一种可用资金 ${nameA} or ${nameB}`)
        }
    }

    /***
     * 计算偏移量
     */
    calG() {
        if (this.lastBreak == BreakType.Unknown) {
            const g1 = 0 + this.G;
            const g2 = 1 + this.G;
            logger.info(`lastBreak:Unknown BaseG:${this.G} g1:${g1} g2:${g2}`)
            return [g1, g2]
        }
        if (this.lastBreak == BreakType.Up) {
            const g1 = 1 + this.G;
            const g2 = 1 + this.G;
            logger.info(`lastBreak:Up BaseX:${this.G} g1:${g1} g2:${g2}`)

            return [g1, g2]
        }
        if (this.lastBreak == BreakType.Down) {
            // noinspection PointlessArithmeticExpressionJS
            const g1 = 0 + this.G;
            const g2 = 2 + this.G;
            logger.info(`lastBreak:Down BaseX:${this.G} g1:${g1} g2:${g2}`)
            return [g1, g2]
        }
        logger.warn(`lastBreak is None!! default g1,g2`)
        return [0, 1]
    }


    calXY(lowerTick: number, upperTick: number, current_sqrt_price: string) {
        const coinAmountBN = new BN(toBigNumberStr(1000, this.decimalsA));
        const fix_amount_a = true
        const roundUp = true
        const slippage = 0.05
        const curSqrtPrice = new BN(current_sqrt_price);

        const liquidityInput = ClmmPoolUtil.estLiquidityAndCoinAmountFromOneAmounts(
            lowerTick,
            upperTick,
            coinAmountBN,
            fix_amount_a,
            roundUp,
            slippage,
            curSqrtPrice
        );
        const x = scalingDown(liquidityInput.coinAmountA.toNumber(), this.decimalsA);
        const y = scalingDown(liquidityInput.coinAmountB.toNumber(), this.decimalsB);
        return [x, y]
    }

    /***
     * 开仓逻辑
     * @param pool 池子信息
     */
    async toOpenPos(pool: Pool) {
        // 获取当前价格位置
        const currentTick = pool.current_tick;
        const currentSqrtPrice = pool.current_sqrt_price;
        // 计算偏移量
        let [g1, g2] = this.calG();
        // 计算目标开仓区间
        const tickSpacing = pool.ticks_manager.tick_spacing
        const [lowerTick, upperTick] = calTickIndex(currentTick, tickSpacing, g1, g2)
        logger.info(`tickSpacing:${tickSpacing} currentTick:${currentTick} lowerTick:${lowerTick} upperTick:${upperTick}`);
        // 换算价格区间
        const currentPrice = TickMath.tickIndexToPrice(currentTick, this.decimalsA, this.decimalsB).toNumber();
        const lowerTickPrice = TickMath.tickIndexToPrice(lowerTick, this.decimalsA, this.decimalsB).toNumber();
        const upperTickPrice = TickMath.tickIndexToPrice(upperTick, this.decimalsA, this.decimalsB).toNumber();

        logger.info(`CurrentPrice: ${currentPrice} ||Price Range:  ${lowerTickPrice} <--> ${upperTickPrice}`);
        const [x, y] = this.calXY(lowerTick, upperTick, currentSqrtPrice)
        logger.info(`x:y = ${x}:${y}`);
        // 配平前钱包资产信息
        const result = await this.getAssert();
        if (result === null) {
            logger.error("获取资金信息异常 => PASS");
            return;
        }
        const [balanceA, balanceB, balanceSUI] = result as number[];
        logger.info(`配平前钱包资产: ${this.nameA}: ${balanceA} | ${this.nameA}: ${balanceB} SUI: ${balanceSUI}`);
        const [a2b, amount] = this.calSwap(currentPrice, x, y, balanceA, balanceB, 0.1);
        logger.info(`a2b: ${a2b} amount: ${amount}`);
        // return;

        if (amount >= 0) {
            logger.info(`正在配平 => Swap`);
            const swapOK = await this.toSwap(pool, a2b, amount, 0.05)
            if (swapOK) {
                logger.info(`Swap success => 去开仓`);
                const addOk = await this.toAddLiquidity(lowerTick, upperTick)
                logger.info(`Add Liquidity ${addOk ? "success" : "fail"}`)
            } else {
                logger.error(`Swap fail => 禁止开仓`);
                return;
            }
        } else {
            logger.info(`无需Swap => 直接开仓`);
            // 无需swap，直接开仓
            const addOk = await this.toAddLiquidity(lowerTick, upperTick)
            logger.info(`Add Liquidity ${addOk}`)
        }
    }

    /***
     * 添加流动性仓位
     * @param lowerTick 仓位区间 Lower
     * @param upperTick 仓位区间 Upper
     */
    async toAddLiquidity(lowerTick: number, upperTick: number) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待0.5~1秒，必须，防止资产数据延迟获取
        const result = await this.getAssert();
        if (result === null) {
            logger.error("获取资金信息异常 => Not ADD Liquidity");
            return false;
        }
        const [balanceA, balanceB, balanceSUI] = result as number[];
        logger.info(`开仓前钱包资产: ${this.nameA}: ${balanceA} | ${this.nameA}: ${balanceB} SUI: ${balanceSUI}`);
        const pool = await this.getPool(this.poolId)
        if (!pool) {
            logger.info(`获取Pool异常 => Not ADD Liquidity`);
            return false;
        }
        const curSqrtPrice = new BN(pool.current_sqrt_price);
        let coinAmountBN = new BN(toBigNumberStr(balanceB * 0.9, this.decimalsB));
        let roundUp = true
        let slippage = 0.05
        const isCoinA = false;

        const liquidityInput = ClmmPoolUtil.estLiquidityAndCoinAmountFromOneAmounts(
            lowerTick,
            upperTick,
            coinAmountBN,
            isCoinA,
            roundUp,
            slippage,
            curSqrtPrice
        );
        // liquidityInput
        try {
            let oc = new OnChainCalls(this.client, mainnet, {signer: this.keyPair});
            let resp = await oc.openPositionWithFixedAmount(pool, lowerTick, upperTick, liquidityInput);
            // logger.info(`Add Liquidity Resp: ${JSON.stringify(resp)}`);
            // @ts-ignore
            return resp["effects"]['status']['status'] === 'success'
        } catch (e) {
            logger.info(`ADD Liquidity Failed: ${e}`);
            return false;
        }
    }

    /**
     * 进行Token Swap操作
     * @param poolState 池子信息
     * @param a2b swap方向，a2b:true：A==>B ,a2b:false：B==>A
     * @param amount 转移数量,固定为输入数量
     * @param slippage 滑点，(0~1)
     */
    async toSwap(poolState: Pool, a2b: boolean, amount: number, slippage = 0.05) {
        try {
            let iSwapParams: ISwapParams = {
                pool: poolState,
                amountIn: toBigNumber(amount, a2b ? this.decimalsA : this.decimalsB),
                amountOut: 0,
                aToB: a2b,
                byAmountIn: true,
                slippage: slippage
            }
            let oc = new OnChainCalls(this.client, mainnet, {signer: this.keyPair});

            const resp: OnChainCallResponse = await oc.swapAssets(iSwapParams);
            // logger.info(`Swap Resp: ${JSON.stringify(resp)}`);
            // @ts-ignore
            return resp["effects"]['status']['status'] === 'success'

        } catch (e) {
            logger.error(`Swap Failed: ${e}`);
            return false
        }

    }


    /**
     * 计算配平参数
     * @param p 当前价格
     * @param x 目标代币A数量
     * @param y 目标代币B数量
     * @param a 当前钱包代币A余额
     * @param b 当前钱包代币B余额
     * @param slip 允许误差，0.1表示10%
     * @returns a2b swap方向，amount swap数量
     */
    calSwap(p: number, x: number, y: number, a: number, b: number, slip: number): [boolean, number] {
        const k = x / y;
        const A = this.nameA;
        const B = this.nameB;

        if (b === 0) {
            logger.info(`${B} 资产不足, 执行 ${A} => ${B}`);
            const a2b = true;
            const n = (a - b * k) / (1 + p * k);  // n此时表示代币A的输入值
            const a_ = a - n;
            const b_ = b + n * p;
            logger.info(`计算 Swap:${A}->${B},输入转移数量:${n} 配平后 ${a_} ${b_}`);
            return [a2b, this.round(n, 4)];
        }

        if (k <= a / b && a / b <= (1 + slip) * k) {
            const a2b = false;
            const n = 0;
            logger.info(`Swap:否 配平前 ${a} ${b} 转移数量:${n} 滑点:${slip}`);
            return [a2b, n];
        }

        if (a / b > (1 + slip) * k) {
            logger.info(`${B} 资产不足, 执行 ${A} => ${B}`);
            const n = (a - b * k) / (1 + p * k);  // n此时表示代币A的输入值
            const a_ = a - n;
            const b_ = b + n * p;
            const a2b = true;
            logger.info(`计算 Swap:${A}->${B},输入转移数量:${n} 配平后 ${a_} ${b_}`);
            return [a2b, this.round(n, 4)];
        }

        if (a / b < k) {
            logger.info(`${A} 资产不足, 执行 ${B} => ${A}`);
            const n = (b * k * p - a * p) / (1 + k * p);  // m此时表示输入代币B的数量
            const a_ = a + n / p;
            const b_ = b - n;
            const a2b = false;
            logger.info(`计算 Swap:${B}->${A},输入转移数量:${n} 配平后 ${a_} ${b_}`);
            return [a2b, this.round(n, 4)];
        }

        // 如果没有满足的条件，返回默认值
        return [false, 0];
    }

    /***
     * 检测仓位
     * @param pos 仓位信息
     * @param pool 池子信息
     */
    async checkPos(pos: IPosition, pool: Pool) {
        if (pos.pool_id != pool.id) {
            logger.warn(`发现非策略目标Pool:${pos.pool_id} => PASS`)
            return
        }
        const current_tick = pool.current_tick;
        // let currentSqrtPrice = pool.current_sqrt_price;

        let lowerTick = pos.lower_tick;
        let upperTick = pos.upper_tick;
        let posID = pos.position_id;

        if (current_tick < upperTick && current_tick > lowerTick) {
            logger.info(`当前Tick: ${current_tick} => 处于区间:[${lowerTick},${upperTick}] => 保留`);
            return;
        }
        //突破
        if (current_tick < lowerTick) {
            logger.info(`当前Tick: ${current_tick} => 突破下区间:${lowerTick} => 平仓`);

            const closeOK = await this.toClosePos(pool, posID);
            logger.info(`关闭仓位: ${closeOK ? "success" : "fail"}`);

            this.lastBreak = BreakType.Down
            logger.info(`设置突破标志位: ${this.lastBreak}`);
            return;
        }
        // 突破
        if (current_tick > upperTick) {
            logger.info(`当前Tick: ${current_tick} => 突破上区间:${upperTick} => 平仓`);

            const closeOK = await this.toClosePos(pool, posID);
            logger.info(`关闭仓位: ${closeOK ? "success" : "fail"}`);

            this.lastBreak = BreakType.Up
            logger.info(`设置突破标志位: ${this.lastBreak}`);

            return;
        }

    }

    async toClosePos(pool: Pool, posID: string) {
        try {
            let oc = new OnChainCalls(this.client, mainnet, {signer: this.keyPair});
            let resp = await oc.closePosition(pool, posID);
            // logger.info(`Close Resp: ${JSON.stringify(resp)}`);
            // @ts-ignore
            return resp["effects"]['status']['status'] === 'success'
        } catch (e) {
            logger.error(`${e}`);
            return false;
        }

    }

    /**
     * 核心启动器
     */
    async core() {
        // 获取当前仓位
        const positions = await this.getUserPositions(this.walletAddress)
        if (positions === null) {
            logger.warn(`获取仓位列表fail => PASS`);
            return;
        }
        // 仓位集合过滤，去除非目标池下的仓位
        const poss: IPosition[] = positions.filter(position => position.pool_id === this.poolId);
        // 获取Pool信息
        const pool = await this.getPool(this.poolId);
        if (pool === null) {
            logger.warn("获取Pool信息fail => PASS")
            return;
        }
        logger.info(`获取Pool信息: ${this.nameA}/${this.nameB} success`);

        // 开仓逻辑
        if (poss.length === 0) {
            logger.info(`当前仓位不存在 => 准备开仓`);
            await this.toOpenPos(pool);
            return;
        }

        // 仓位检测和平仓
        for (const pos of poss) {
            await this.checkPos(pos, pool)
        }

    }

    /**
     * 间隔运行核心
     */
    async run() {
        console.log("run this Strategy");
        await this.initSys();
        // noinspection InfiniteLoopJS
        while (true) { // 无限循环
            await this.core(); // 等待 fetchData 完成
            await new Promise(resolve => setTimeout(resolve, 10000)); // 等待10秒
        }
    }

    private round(value: number, decimals: number): number {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }
}