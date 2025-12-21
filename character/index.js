import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import characters from "./character.js";
import pinyins from "./pinyin.js";
import skills from "./skill.js";
import translates from "./translate.js";
import characterIntros from "./intro.js";
import characterFilters from "./characterFilter.js";
import { characterSort, characterSortTranslate } from "./sort.js";

game.import("character", function() {
    return {
        name: "mc1",
        connect: true,
        character: { ...characters },
        characterSort: {
            mc1: characterSort
        },
        characterFilter: { ...characterFilters },
        characterIntro: { ...characterIntros },
        skill: { ...skills },
        translate: { ...translates, ...characterSortTranslate },
        pinyins: { ...pinyins }
    };
});

/* export default function() {
    return {
    name:"MC-1",arenaReady:function(){},
    content: function(config,pack) {
        
    },
    prepare: function() {
        
    },
    precontent: function() {
        const NAME = this.name;
        
        function add_character_pack(
            PackName,
            PackInfo,
            PreContent = (lib, game, ui, get, ai, _status) => {
                return;
            }
        ) {
            PackInfo.name = PackName;
            PackInfo.connect = true;

            for (const i in PackInfo.character) {
                PackInfo.character[i][4].push("img:extension/${NAME}/image/character/${i}.jpg");
            }

            game.import(
                "character",
                function (lib, game, ui, ai, _status) {
                    PreContent(lib, game, ui, ai, _status);
                    return PackInfo;
                }
            );
        }

        add_character_pack(
            "MC-1",
            {
                character: {
                    "史莱姆": [
                        "none",
                        "qun",
                        "4/4/0"
                        ["分裂","融合","裂隙"],
                        ["史莱姆栖息在世界中的潮湿黑暗的地方，它们的攻击速度是其他非凝胶生物无法比拟的。 —— Minecraft Earth"],
                    ],
                },
                skill: {
                    skill: {
                        "分裂": {
                            trigger: {
                                player: "damageEnd"
                            },
                            filter(event, player) {
                                return player.maxHp > 1;
                            },
                            async content(event, trigger, player) {
                                if (!player.getCards("h").length){
                                    return;
                                }
                                const result = await player.chooseCard("h", "选择一张牌作为“裂”").forResult();
                                if (result.bool){
                                    await player.addToExpansion(result.cards, player, "giveAuto").gaintag.add("分裂");
                                    await player.loseMaxHp();
                                    await player.recover(player.maxHp - player.hp);
                                }
                            },
                            intro: {
                                content: "expansion",
                                markcount: "expansion",
                            },
                            onremove(player, skill) {
                                const cards = player.getExpansions(skill);
                                if (cards.length) {
                                    player.loseToDiscardpile(cards);
                                }
                            },
                            "_priority": 0,
                        },
                        "融合": {
                            enable: "phaseUse",
                            usable: 1,
                            filter(event, player) {
                                return player.countExpansions("分裂") > 0;
                            },
                            async content(event, trigger, player) {
                                const result = await player.chooseCardButton(
                                    player.getExpansions("分裂"), 1, "选择移去一张“裂”", true
                                ).forResultLinks();
                                await player.loseToDiscardpile(result);
                                await player.gainMaxHp();
                                await player.recover();
                            },
                            "_priority": 0,
                        },
                        "裂隙": {
                            group: ["裂隙_1", "裂隙_2"],
                            subSkill: {
                                "1": {
                                    trigger: {
                                        player: "useCardToPlayered"
                                    },
                                    forced: true,
                                    filter(event, player) {
                                        return event.card.name == "sha";
                                    },
                                    content(event, trigger, player) {
                                        if (player.countExpansions("分裂") >= 3){
                                            trigger.getParent().directHit.add(trigger.target);
                                        }
                                    },
                                    mod: {
                                        cardUsable(card, player, num) {
                                            if (card.name == "sha") {
                                                return 2 ** player.countExpansions("分裂");
                                            }
                                        },
                                        maxHandcardBase(player, num) {
                                            return 4;
                                        }
                                    }
                                },
                                "2": {
                                    usable: 1,
                                    trigger: {
                                        player: "useCardToPlayered"
                                    },
                                    filter(event, player) {
                                        return event.card.name == "sha";
                                    },
                                    logTarget: "target",
                                    content(event, trigger, player) {
                                        "step 0";
                                        for (let i = 1; i <= player.countExpansions("分裂"); i++) {
                                            player.discardPlayerCard(trigger.target, "h", true);
                                        }
                                        "step 1";
                                        for (let i = 1; i <= player.countExpansions("分裂"); i++) {
                                            player.judge(function(card) {
                                                if (get.color(card) == "red") {
                                                    trigger.target.loseHp(1);
                                                }
                                                else {
                                                    player.discardPlayerCard(trigger.target, "he", true);
                                                }
                                            });
                                        }
                                    }
                                }
                            }
                        },
                    },
                },
                translate: {
                    "史莱姆": "史莱姆",
                    "MC-1": "MC-1",
                },
            }
        )
    },
    help:{},
    config:{},
    /*package:{
        character: {
            character: {
                "史莱姆": {
                    sex: "none",
                    group: "qun",
                    hp: 4,
                    maxHp: 4,
                    hujia: 0,
                    skills: ["分裂","融合","裂隙"],
                    img: "extension/MC-1/史莱姆.jpg",
                },
            },
            translate: {
                "史莱姆": "史莱姆",
                "MC-1": "MC-1",
                "分裂": "分裂",
                "分裂_info": "当你受到伤害后，你可以将一张手牌置于武将牌上，称为“裂”，然后你减少一点体力上限并将体力回复至体力上限。",
                "融合": "融合",
                "融合_info": "出牌阶段限一次，你可以移去一张“裂”，然后你增加一点体力上限并回复一点体力。",
                "裂隙": "裂隙",
                "裂隙_info": "锁定技，你使用【杀】的次数限制为2^X且你的手牌限制始终为4；若你有3张“裂”，你使用的【杀】不可被响应。每轮限一次，你使用【杀】指定目标时，可依次弃置其至多X张手牌，并进行X次判定：每有一次红色，其失去一点体力；每有一次黑色，你弃置其区域里的一张牌（X为“裂”的数量）。"
            },
        },
        card: {
            card: {
            },
            translate: {
            },
            list: [],
        },
        skill: {
            skill: {
                "分裂": {
                    trigger: {
                        player: "damageEnd"
                    },
                    filter(event, player) {
                        return player.maxHp > 1;
                    },
                    async content(event, trigger, player) {
                        if (!player.getCards("h").length){
                            return;
                        }
                        const result = await player.chooseCard("h", "选择一张牌作为“裂”").forResult();
                        if (result.bool){
                            await player.addToExpansion(result.cards, player, "giveAuto").gaintag.add("分裂");
                            await player.loseMaxHp();
                            await player.recover(player.maxHp - player.hp);
                        }
                    },
                    intro: {
                        content: "expansion",
                        markcount: "expansion",
                    },
                    onremove(player, skill) {
                        const cards = player.getExpansions(skill);
                        if (cards.length) {
                            player.loseToDiscardpile(cards);
                        }
                    },
                    "_priority": 0,
                },
                "融合": {
                    enable: "phaseUse",
                    usable: 1,
                    filter(event, player) {
                        return player.countExpansions("分裂") > 0;
                    },
                    async content(event, trigger, player) {
                        const result = await player.chooseCardButton(
                            player.getExpansions("分裂"), 1, "选择移去一张“裂”", true
                        ).forResultLinks();
                        await player.loseToDiscardpile(result);
                        await player.gainMaxHp();
                        await player.recover();
                    },
                    "_priority": 0,
                },
                "裂隙": {
                    group: ["裂隙_1", "裂隙_2"],
                    subSkill: {
                        "1": {
                            trigger: {
                                player: "useCardToPlayered"
                            },
                            forced: true,
                            filter(event, player) {
                                return event.card.name == "sha";
                            },
                            content(event, trigger, player) {
                                if (player.countExpansions("分裂") >= 3){
                                    trigger.getParent().directHit.add(trigger.target);
                                }
                            },
                            mod: {
                                cardUsable(card, player, num) {
                                    if (card.name == "sha") {
                                        return 2 ** player.countExpansions("分裂");
                                    }
                                },
                                maxHandcardBase(player, num) {
                                    return 4;
                                }
                            }
                        },
                        "2": {
                            usable: 1,
                            trigger: {
                                player: "useCardToPlayered"
                            },
                            filter(event, player) {
                                return event.card.name == "sha";
                            },
                            logTarget: "target",
                            content(event, trigger, player) {
                                "step 0";
                                for (let i = 1; i <= player.countExpansions("分裂"); i++) {
                                    player.discardPlayerCard(trigger.target, "h", true);
                                }
                                "step 1";
                                for (let i = 1; i <= player.countExpansions("分裂"); i++) {
                                    player.judge(function(card) {
                                        if (get.color(card) == "red") {
                                            trigger.target.loseHp(1);
                                        }
                                        else {
                                            player.discardPlayerCard(trigger.target, "he", true);
                                        }
                                    });
                                }
                            }
                        }
                    }
                },
            },
            translate: {
                "分裂": "分裂",
                "分裂_info": "当你受到伤害后，你可以将一张手牌置于武将牌上，称为“裂”，然后你减少一点体力上限并将体力回复至体力上限。",
                "融合": "融合",
                "融合_info": "出牌阶段限一次，你可以移去一张“裂”，然后你增加一点体力上限并回复一点体力。",
                "裂隙": "裂隙",
                "裂隙_info": "锁定技，你使用【杀】的次数限制为2^X且你的手牌限制始终为4；若你有3张“裂”，你使用的【杀】不可被响应。每轮限一次，你使用【杀】指定目标时，可依次弃置其至多X张手牌，并进行X次判定：每有一次红色，其失去一点体力；每有一次黑色，你弃置其区域里的一张牌（X为“裂”的数量）。",
            },
        },
        intro: "还原了Minecraft的怪物！",
        author: "Hamburger0abcde",
        diskURL: "",
        forumURL: "",
        version: "1.0",
    },
    files: {
        "character": ["史莱姆.jpg"],
        "card": [],
        "skill": [],
        "audio": []
    },
        connect: true
    }
}; */