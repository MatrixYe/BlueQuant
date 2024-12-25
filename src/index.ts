/**
 * 文件名: index.ts
 * 创建时间: 2024/12/17 18:11
 * 作者: yepeng
 * 描述:
 */
import {Strategy} from "./strategy";
import {config} from "dotenv"

config();

async function main() {
    console.log("this is main.ts")
    const private_key = process.env.PRIVATE_KEY as string;
    console.log(`private_key:${private_key}`);

    const endpoint = process.env.ENDPPOINT as string;
    console.log(`endpoint:${endpoint}`);

    const poolId = process.env.POOL_ID as string;
    console.log(`poolId:${poolId}`);

    const g = process.env.G as string
    console.log(`g:${g}`);

    const st = new Strategy(endpoint, private_key, poolId, Number(g));
    await st.run();


}

main();