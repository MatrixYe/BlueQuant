/**
 * 文件名: utils.ts
 * 创建时间: 2024/12/11 16:02
 * 作者: yepeng
 * 描述: 一些简化的工具
 */

// 格式化对象数据Json
export function toJson(obj: Object): string {
    return JSON.stringify(obj, null, 2);
}

// 格式化打印
export function print(obj: object): void {
    // const s = JSON.stringify(obj, null, 2);
    // console.log(s);
    console.dir(obj, {depth: null});
}


// 将字符串转换为精度的数
export function stringToDividedNumber(input: string, decimals: number | null): number {
    decimals = decimals ? decimals : 0;
    const number = parseInt(input, 10);
    if (isNaN(number)) {
        throw new Error("输入的字符串无法转换为有效的整数");
    }
    return number / Math.pow(10, decimals);
}

// coin类型转名称
export function coinTypeToName(coinType: string): string {
    return coinType.split("::")[2];

}

export function calTickIndex(currentIndex: number, tickSpacing: number, g1: number, g2: number) {
    const lowerIndex = (Math.floor(currentIndex / tickSpacing) - g1) * tickSpacing;
    const upperIndex = (Math.floor(currentIndex / tickSpacing) + g2) * tickSpacing;
    return [lowerIndex, upperIndex]
}

export function scalingUp(value: number, decimals: number) {
    return Math.round(value * Math.pow(10, decimals));
}

export function scalingDown(value: number, decimals: number) {
    return value / Math.pow(10, decimals);
}