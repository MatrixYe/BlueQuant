/**
 * 文件名: config.ts
 * 创建时间: 2024/12/17 23:18
 * 作者: yepeng
 * 描述:
 */

export const mainnet = {
    "GlobalConfig": "0x03db251ba509a8d5d8777b6338836082335d93eecbdd09a11e190a1cff51c352",
    "ProtocolFeeCap": "0x55697473304e901372020f30228526c4e93558b23259d90bc6fdddedf83295d2",
    "Display": "0x5f34ee74e113d74ae9546695af6e6d0fde51731fe8d9a71309f8e66b725d54ab",
    "AdminCap": "0xc5e736b21175e1f8121d58b743432a39cbea8ee23177b6caf7c2a0aadba8d8b9",
    "UpgradeCap": "0xd5b2d2159a78030e6f07e028eb75236693ed7f2f32fecbdc1edb32d3a2079c0d",
    "Publisher": "0xd9810c5d1ec5d13eac8a70a059cc0087b34d245554d8704903b2492eebb17767",
    "BasePackage": "0x3492c874c1e3b3e2984e8c41b589e642d4d0a5d6459e5a9cfc2d52fd7c89c267",
    "CurrentPackage": "0x6c796c3ab3421a68158e0df18e4657b2827b1f8fed5ed4b82dba9c935988711b",
    "Operators": {
        "Admin": "0x37a8d55f29e5b4bdba0cb3fe0ba51a93db8c868fe0de649e1bf36bb42ea7d959"
    },
    "Pools": [
        {
            "id": "0x0c89fd0320b406311c05f1ed8c4656b4ab7ed14999a992cc6c878c2fad405140",
            "coinA": "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
            "coinB": "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
            "coinADecimals": 6,
            "coinBDecimals": 6,
            "name": "wUSDC-USDC",
            "fee": 100,
            "tickSpacing": 1
        },
        {
            "id": "0xf6ab5a6e7cd88b99c8c434fc7fa739c693e1731342e5b5a42c137fdef291bcac",
            "coinA": "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI",
            "coinB": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
            "coinADecimals": 9,
            "coinBDecimals": 9,
            "name": "haSUI-SUI",
            "fee": 100,
            "tickSpacing": 1
        },
        {
            "id": "0x0321b68a0fca8c990710d26986ba433d06b351deba9384017cd6175f20466a8f",
            "coinA": "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
            "coinB": "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
            "coinADecimals": 6,
            "coinBDecimals": 6,
            "name": "USDT-USDC",
            "fee": 100,
            "tickSpacing": 1
        },
        {
            "id": "0x3b585786b13af1d8ea067ab37101b6513a05d2f90cfe60e8b1d9e1b46a63c4fa",
            "coinA": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
            "coinB": "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
            "coinADecimals": 9,
            "coinBDecimals": 6,
            "name": "SUI-USDC",
            "fee": 2000,
            "tickSpacing": 40
        },
        {
            "id": "0xa701a909673dbc597e63b4586ace6643c02ac0e118382a78b9a21262a4a2e35d",
            "coinA": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
            "coinB": "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
            "coinADecimals": 9,
            "coinBDecimals": 6,
            "name": "SUI-USDC",
            "tickSpacing": 20,
            "fee": 1000
        },
        {
            "id": "0xfe36ddc436cefc95d320ad1ecb088f8156d306f5b00f7b8626148dfe349b9984",
            "coinA": "0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH",
            "coinB": "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
            "coinADecimals": 8,
            "coinBDecimals": 6,
            "name": "ETH-USDC",
            "tickSpacing": 40,
            "fee": 2000
        },
        {
            "id": "0x38282481e3a024c50254c31ebfc4710e003fe1b219c0aa31482a860bd58c4ab0",
            "coinA": "0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN",
            "coinB": "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
            "coinADecimals": 8,
            "coinBDecimals": 6,
            "name": "WBTC-USDC",
            "tickSpacing": 40,
            "fee": 2000
        },
        {
            "id": "0x1b06371d74082856a1be71760cf49f6a377d050eb57afd017f203e89b09c89a2",
            "coinA": "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
            "coinB": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
            "coinADecimals": 6,
            "coinBDecimals": 9,
            "name": "DEEP-SUI",
            "tickSpacing": 40,
            "fee": 2000
        }
    ]
}