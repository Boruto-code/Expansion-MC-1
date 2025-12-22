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
                const directcontrol = await player.chooseControl("失去一点体力", "弃置两张牌", function(event, player) {
                    return _status.event.choice;
                }).forResultControl();

                if (directcontrol) {
                    player.loseHp();
                } else {
                    player.chooseToDiscard(2, true);
                }
            } else {
                const directcontrol = await player.chooseControl("回复一点体力", "摸两张牌", function(event, player) {
                    return _status.event.choice;
                }).forResultControl();

                if (directcontrol) {
                    player.recover();
                } else {
                    player.draw(2);
                }
            }
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
                    // 僵尸
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
        // Pass
    }
};

export default skills;