/**
 * 文件名: mylog.ts
 * 创建时间: 2024/12/18 14:53
 * 作者: yepeng
 * 描述:
 */
import pino from "pino";

export const logger = pino({
    level: 'info',
    transport: {
        targets: [
            {
                target: 'pino-pretty',
                options: {
                    colorize: true, // 启用颜色
                    translateTime: 'yyyy-mm-dd HH:MM:ss.l', // 格式化时间
                    ignore: 'pid,hostname', // 忽略不需要的字段
                }
            }
        ]
    }
});