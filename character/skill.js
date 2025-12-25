import { lib, game, ui, get, ai, _status } from "../../../noname.js";

/** @type { importCharacterConfig['skill'] } */
const skills = {
    poison: {
        mark: true,
        marktext: "毒",
        intro: {
            name: "中毒",
            content: "拥有“毒”标记的角色回合开始时，失去一点体力并移去1枚“毒”标记。",
        },
        forced: true,
        frequent: true,
        popup: false,
        trigger: {
            player: "phaseBegin"
        },
        content(event, player) {
            if (player.countMark("poison") == 0) {
                player.removeSkill("poison");
            } else {
                player.removeMark("poison");
                if (player.hp > 1) {
                    player.loseHp();
                }
            }
        },
        
    },

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
        ai: {
            maixie: true
        }
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
                popup: true,
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
        popup: false,
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
                if (card.name == "sha") {
                    return true;
                }
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
            trigger.player.changeGroup("wang");
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
                    player.addSkills(["zhibao", "jinxi"]);
                } else if (suit == "spade") {
                    player.addSkills(["tongdi", "jinghua"]);
                } else if (suit == "heart") {
                    player.removeSkill("riye");
                    player.addSkills(["shuizhan", "jianji", "riye_edit"]);
                } else {
                    player.removeSkill("riye");
                    player.addSkills(["fuhua", "riye_edit_2"]);
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
                    return event.player !== player && get.distance(event.player, player) <= 1;
                },
                content(event, trigger, player) {
                    trigger.num++;
                }
            }
        }
    },
    tongdi: {
        trigger: {
            source: "damageBegin"
        },
        forced: true,
        frequent: true,
        content(event, trigger, player) {
            "step 0";
            player.draw(trigger.num);
            "step 1";
            player.chooseTarget(trigger.num, false, `请选择${get.cnNumber(trigger.num)}名角色`);
            "step 2";
            for (let target of result.targets) {
                target.draw(trigger.num);
            }
        }
    },
    jinghua: {
        juexingji: true,
        forced: true,
        trigger: {
            player: "dyingEnd"
        },
        async content(event, trigger, player) {
            await player.loseMaxHp();
            await player.recoverTo(player.maxHp);
            await player.removeSkill("riye");
            await player.addSkill("tongdi_upgrade");
        }
    },
    tongdi_upgrade: {
        trigger: {
            source: "damageBegin"
        },
        forced: true,
        frequent: true,
        content(event, trigger, player) {
            "step 0";
            player.draw(3);
            "step 1";
            player.chooseTarget(3, false, `请选择三名角色`);
            "step 2";
            for (let target of result.targets) {
                target.draw(3);
            }
        }
    },
    shuizhan: {
        group: ["shuizhan_1", "shuizhan_2"],
        subSkill: {
            1: {
                forced: true,
                frequent: true,
                trigger: {
                    player: "damageBegin2"
                },
                content(event, trigger, player) {
                    player.judge(function(card) {
                        if (get.color(card) == "red") {
                            trigger.num--;
                        }
                    })
                }
            },
            2: {
                forced: true,
                frequent: true,
                trigger: {
                    source: "damageBegin2"
                },
                logTarget: "player",
                content(event, trigger, player) {
                    player.judge(function(card) {
                        if (get.color(card) == "red") {
                            trigger.num++;
                        }
                    })
                }
            }
        }
    },
    jianji: {
        unique: true,
        limited: true,
        trigger: {
            player: "phaseZhunbeiBegin"
        },
        derivation: "yuanji",
        init(player) {
            player.storage.jianji = false;
        },
        filter(event, player) {
            return !player.storage.jianji;
        },
        content(event, player) {
            "step 0";
            player.awakenSkill("jianji");
            "step 1";
            player.judge(function(card) {
                if (get.color(card) == "red") {
                    player.addSkill("yuanji");
                    player.disableEquip(1);
                }
            })
        }
    },
    yuanji: {
        forced: true,
        frequent: true,
        popup: false,
        trigger: {
            source: "damageBegin1"
        },
        filter(event, player) {
            return get.name(event.card) == "sha" && get.nature(event.card) == "thunder";
        },
        content(event, trigger, player) {
            trigger.num++;
        },
        mod: {
            targetInRange(card) {
                if (card.name == "sha") {
                    return true;
                }
            },
            cardnature(card, player) {
                if (get.name(card) == "sha") {
                    return "thunder";
                }
            }
        }
    },
    riye_edit: {
        mark: true,
        marktext: "☯",
        zhuanhuanji: true,
        forced: true,
        frequent: true,
        intro: {
            content(storage, player, skill) {
                return `回合开始时，你选择一项：1.回复一点体力；2.${storage ? "摸两张牌" : "摸一张牌"}。`;
            }
        },
        trigger: {
            player: "phaseBegin"
        },
        async content(event, trigger, player) {
            player.changeZhuanhuanji("riye_edit");

            if (player.storage.riye_edit) {
                const directcontrol = 
                    await player.chooseControl("回复一点体力", "摸一张牌", function(event, player) {
                        if (player.hp > 2) {
                            return "回复一点体力";
                        } else {
                            return "摸一张牌";
                        }
                    }).set("prompt", "日：回复一点体力或摸一张牌").forResultControl();

                if (directcontrol == "回复一点体力") {
                    player.recover();
                } else {
                    player.draw();
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
    fuhua: {
        trigger: {
            source: "damageSource"
        },
        filter(event, player) {
            if (event._notrigger.includes(event.player)) {
				return false;
			}
			return event.card && event.card.name == "sha" && event.player != player && event.player.isIn();
        },
        content(event, trigger, player) {
            "step 0";
            trigger.player.addMark("poison");
            "step 1";
            trigger.player.addSkills(["fuhua_effect", "poison"]);
        }
    },
    fuhua_effect: {
        forced: true,
        frequent: true,
        popup: false,
        sourceSkill: "fuhua",
        trigger: {
            player: "phaseEnd"
        },
        content(event, player) {
            if (player.countMark("poison") == 0) {
                player.removeSkill("fuhua_effect");
            } else {
                player.chooseToDiscard(1, true);
            }
        }
    },
    riye_edit_2: {
        mark: true,
        marktext: "☯",
        zhuanhuanji: true,
        forced: true,
        frequent: true,
        intro: {
            content(storage, player, skill) {
                return `回合结束时，${storage ? "你摸两张牌" : "所有角色弃置一张牌"}。`;
            }
        },
        trigger: {
            player: "phaseEnd"
        },
        async content(event, trigger, player) {
            player.changeZhuanhuanji("riye_edit_2");

            if (player.storage.riye_edit_2) {
                const players = game.filterPlayer();
                
                for (let i = 0; i < players.length; i++) {
                    players[i].chooseToDiscard(1, true);
                }
            } else {
                player.draw(2);
            }
        }
    }
};

export default skills;