// noinspection JSIgnoredPromiseFromCall

/**
 * 文件名: index.ts
 * 创建时间: 2024/12/17 18:11
 * 作者: yepeng
 * 描述: 启动函数
 */
import {Strategy} from "./strategy";
import {config} from "dotenv"
import {logger} from "./mylog";

config();

async function main() {
    const private_key = process.env.PRIVATE_KEY as string;
    logger.info(`ENV: private_key:${private_key}`);

    const endpoint = process.env.ENDPPOINT as string;
    logger.info(`ENV: endpoint:${endpoint}`);

    const poolId = process.env.POOL_ID as string;
    logger.info(`ENV: poolId:${poolId}`);

    const g = process.env.G as string
    logger.info(`ENV: g:${g}`);

    if (!private_key) {
        throw Error(`private_key Is Nan`);
    }

    if (!endpoint) {
        throw Error(`endpoint Is Nan`);
    }
    if (!poolId) {
        throw Error(`poolId Is Nan`);
    }

    if (!g) {
        throw Error(`g is Nan`);
    }
    const st = new Strategy(endpoint, private_key, poolId, Number(g));
    await st.run();

}

main();