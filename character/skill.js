import { lib, game, ui, get, ai, _status } from "../../../noname.js";

/** @type { importCharacterConfig['skill'] } */
const skills = {
    fenlie: {
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
                await player.addToExpansion(result.cards, player, "giveAuto").gaintag.add("fenlie");
                await player.loseMaxHp();
                await player.recoverTo(player.maxHp);
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
    ronghe: {
        enable: "phaseUse",
        usable: 1,
        filter(event, player) {
            return player.countExpansions("fenlie") > 0;
        },
        async content(event, trigger, player) {
            const result = await player.chooseCardButton(
                player.getExpansions("fenlie"), 1, "选择移去一张“裂”", true
            ).forResultLinks();
            await player.loseToDiscardpile(result);
            await player.gainMaxHp();
            await player.recover();
        },
        "_priority": 0,
    },
    liexi: {
        group: ["liexi_1", "liexi_2"],
        subSkill: {
            1: {
                trigger: {
                    player: "useCardToPlayered"
                },
                forced: true,
                frequent: true,
                filter(event, player) {
                    return event.card.name == "sha";
                },
                content(event, trigger, player) {
                    if (player.countExpansions("fenlie") >= 3){
                        trigger.getParent().directHit.add(trigger.target);
                    }
                },
                mod: {
                    cardUsable(card, player, num) {
                        if (card.name == "sha") {
                            return 2 ** player.countExpansions("fenlie");
                        }
                    },
                    maxHandcardBase(player, num) {
                        return 4;
                    }
                }
            },
            2: {
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
                    for (let i = 1; i <= player.countExpansions("fenlie"); i++) {
                        player.discardPlayerCard(trigger.target, "h", true);
                    }
                    "step 1";
                    for (let i = 1; i <= player.countExpansions("fenlie"); i++) {
                        player.judge(function(card) {
                            if (get.color(card) == "red") {
                                trigger.target.loseHp(1);
                            }
                            else {
                                player.discardPlayerCard(trigger.target, "he", true);
                            }
                        });
                    }
                    "step 2";
                    game.delayx();
                }
            }
        }
    },

    jinggong: {
        trigger: {
            player: "useCardToPlayered"
        },
        forced: true,
        frequent: true,
        filter(event, player) {
            return event.card.name == "sha";
        },
        logTarget: "target",
        content(event, trigger, player) {
            if (trigger.target.hp <= Math.floor(trigger.target.maxHp / 2)) {
                trigger.getParent().directHit.add(trigger.target);
            }
        },
        mod: {
            targetInRange(card) {
                return true;
            }
        }
    },
    qianggong: {
        group: ["qianggong_1", "qianggong_2"],
        subSkill: {
            1: {
                enable: "chooseToUse",
                filterCard(card, player) {
                    return get.color(card) == "black";
                },
                viewAs: { name: "sha" },
                viewAsFilter(player) {
                    if (get.zhu(player, "shouyue")) {
                        if (!player.countCards("hes")) {
                            return false;
                        }
                    } else {
                        if (!player.countCards("hes", { color: "black" })) {
                            return false;
                        }
                    }
                },
                position: "hes",
                prompt: "将一张黑色牌当杀使用",
                check(card) {
                    return 5 - get.value(card);
                }
            },
            2: {
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
                    player.judge(function(card) {
                        const suit = get.suit(card);
                        if (suit == "club") {
                            trigger.getParent().baseDamage += Math.floor(trigger.target.maxHp / 2);
                        } else if (suit == "spade") {
                            trigger.target.turnOver();
                        } else if (suit == "heart") {
                            trigger.target.recoverTo(trigger.target.maxHp);
                            trigger.target.draw(3);
                        } else {
                            player.loseHp();
                            player.chooseToDiscard(3, true);
                        }
                    });
                    "step 1";
                    game.delayx();
                }
            }
        }
    },

    riye: {
        mark: true,
        marktext: "☯",
        zhuanhuanji: true,
        forced: true,
        frequent: true,
        intro: {
            content(storage, player, skill) {
                return `回合开始时，你选择一项：1.${storage ? "回复一点体力" : "失去一点体力"}；2.${storage ? "摸两张牌" : "弃置两张牌"}。`;
            }
        },
        trigger: {
            player: "phaseBegin"
        },
        async content(event, trigger, player) {
            player.changeZhuanhuanji("riye");

            if (player.storage.riye) {
                const directcontrol = 
                    await player.chooseControl("失去一点体力", "弃置两张牌", function(event, player) {
                        if (player.hp > 2) {
                            return "失去一点体力";
                        } else {
                            return "弃置两张牌";
                        }
                    }).set("prompt", "日：失去一点体力或弃置两张牌").forResultControl();

                if (directcontrol == "失去一点体力") {
                    player.loseHp();
                } else {
                    player.chooseToDiscard(2, true);
                }
            } else {
                const directcontrol = 
                    await player.chooseControl("回复一点体力", "摸两张牌", function(event, player) {
                        if (player.hp == player.maxHp) {
                            return "摸两张牌";
                        } else {
                            return "回复一点体力";
                        }
                    }).set("prompt", "夜：回复一点体力或摸两张牌").forResultControl();

                if (directcontrol == "回复一点体力") {
                    player.recover();
                } else {
                    player.draw(2);
                }
            }
        }
    },
    ganran: {
        trigger: {
            global: "damageBegin4"
        },
        forced: true,
        frequent: true,
        filter(event, player) {
            if (!event.source || event.source != player || event.player == player) {
				return false;
			}
			return event.num >= event.player.hp && !player.getStorage("ganran").includes(event.player);
        },
        logTarget: "player",
        content(event, trigger, player) {
            trigger.cancel();
            player.markAuto("ganran", [trigger.player]);
            event.player.changeGroup("wang");
        }
    },
    bianzhong: {
        forced: true,
        frequent: true,
        trigger: {
            global: "gameStart"
        },
        content(event, trigger, player) {
            player.judge(function(card) {
                const suit = get.suit(card);
                if (suit == "club") {
                    player.addSkill("zhibao");
                    player.addSkill("jinxi");
                } else if (suit == "spade") {
                    // 僵尸村民
                } else if (suit == "heart") {
                    // 溺尸
                } else {
                    // 尸壳
                }
            });
        }
    },
    zhibao: {
        forced: true,
        frequent: true,
        trigger: {
            target: "useCardToBefore"
        },
        filter(event, player) {
            return event.card.name == "nanman"||event.card.name == "wanjian";
        },
        async content(event, trigger, player) {
            trigger.cancel();
        }
    },
    jinxi: {
        group: ["jinxi_1", "jinxi_2"],
        subSkill: {
            1: {
                trigger: {
                    global: "damageBegin4"
                },
                forced: true,
                frequent: true,
                filter(event, player) {
                    return get.distance(player, event.player) > 1 && event.source != player;
                },
                logTarget: "player",
                content(event, trigger, player) {
                    trigger.cancel();
                }
            },
            2: {
                trigger: {
                    global: "damageBegin1"
                },
                forced: true,
                frequent: true,
                filter(event, player) {
                    return get.distance(event.player, player) <= 1;
                },
                content(event, trigger, player) {
                    trigger.num++;
                }
            }
        }
    },
    tongdi: {
        trigger: {
            global: "damageEnd"
        },
        forced: true,
        frequent: true,
        logTarget: "player",
        content(event, trigger, player) {
            "step 0";
            player.draw(trigger.num);
            "step 1";
            const targets = 
                player
                    .chooseTarget(trigger.num, true, `请选择${get.cnNumber(trigger.num)}名角色`)
                    .forResult();
            "step 2";
            for (let t of targets.targets) {
                t.draw(trigger.num);
            }
        }
    },
    jinghua: {
        juexingji: true,
        trigger: {
            player: "dyingEnd"
        }
    }
};

export default skills;