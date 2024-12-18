# BLUE DEX CLMM 套利程序

## 运行环境&部署
本机环境需要安装
1. `node.js`
2. `TypeScript`
## 启动方式

必须先配置好配置文件，在项目路径下新建一个文件`.env`示例文件如下：

```.dotenv

# 钱包私钥
PRIVATE_KEY="你的私钥"

# Sui节点URL，替换成你的，这里仅测试
ENDPPOINT="https://fullnode.mainnet.sui.io:443"

# 目标交易POLL地址，这里举例DEEP/BLUE
POOL_ID="0x4b8271fc4819078e44ee9a0506a824b77464789d57ace355d0562a4776c51840"
```
配置文件完成后，你需要在你的钱包中充值一部分资产，具体跟你选择的Pool有关，比如DEEP/BLUE，那么你需要至少任意一种资产（DEEP或者BLUE）不小于0。
- 使用Makefile文件启动
```shell
make start
```
- 或者使用node
```shell
npm install && tsc && node dist/index.js
```

## 策略说明
最简单的策略，自动跟随价格波动进行开仓和平仓，纯粹依赖奖励，当奖励占比小于手续费占比时，就不要再使用了。
- 默认最小区间为3倍TickSpacing
- 默认资金使用率80%
- 其他辅助逻辑一律不要了
## 更新说明
todo 程序先跑起来，后面的事后面再说。