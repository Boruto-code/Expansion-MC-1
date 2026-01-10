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
            player.removeMark("poison");
            if (player.hp > 1) {
                player.loseHp();
            }
            if (player.countMark("poison") == 0) {
                player.removeSkill("poison");
            }
        },
    },

    fenlie: {
        trigger: {
            player: "damageEnd"
        },
        filter(event, player) {
            return player.maxHp > 1 && player.countCards("h") > 0;
        },
        async content(event, trigger, player) {
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
            const result = await player
                    .chooseCardButton(player.getExpansions("fenlie"), 1, "选择收回一张“裂”", true)
                    .forResultLinks();

            await player.gain(result);
            await player.gainMaxHp();
            await player.recover();
        },
    },
    liexi: {
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
    weigong: {
        usable: 1,
        trigger: {
            player: "useCardToPlayered"
        },
        filter(event, player) {
            return event.card.name == "sha" && player.countExpansions("fenlie");
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
            source: "damageBegin4"
        },
        filter(event, player) {
            if (!event.source || event.player == player) {
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
                    player.changeSkin("bianzhong", "zombie_villager");
                } else if (suit == "heart") {
                    player.removeSkill("riye");
                    player.addSkills(["shuizhan", "jianji", "riye_edit"]);
                    player.changeSkin("bianzhong", "drowned");
                } else {
                    player.removeSkill("riye");
                    player.addSkills(["fuhua", "jiqun", "riye_edit_2"]);
                    player.changeSkin("bianzhong", "husk");
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
            source: "damageEnd",
            player: "damageEnd"
        },
        forced: true,
        frequent: true,
        content(event, trigger, player) {
            "step 0";
            player.draw(trigger.num);
            "step 1";
            player.chooseTarget([1, trigger.num], false, `请选择至多${get.cnNumber(trigger.num)}名角色`);
            "step 2";
            for (let target of result.targets) {
                target.draw(trigger.num);
            }
        },
        ai: {
            maixie: true
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
        },
        ai: {
            maixie: true
        }
    },
    tongdi_upgrade: {
        trigger: {
            source: "damageEnd",
            player: "damageEnd"
        },
        forced: true,
        frequent: true,
        content(event, trigger, player) {
            "step 0";
            player.draw(3);
            "step 1";
            player.chooseTarget([1, 3], false, `请选择至多三名角色`);
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
                        } else {
                            player.draw(2);
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
                        } else {
                            player.draw(2);
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
                    player.addAdditionalSkill("yuanji");
                    player.disableEquip(1);
                }
            })
        }
    },
    yuanji: {
        forced: true,
        frequent: true,
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
            trigger.player.addAdditionalSkill("poison");
            "step 2";
            player.discardPlayerCard("he", trigger.player, true);
        }
    },
    jiqun: {
        usable: 2,
        enable: "phaseUse",
        filter(event, player) {
            return player.countCards("h") > 0;
        },
        content(event, player) {
            "step 0";
            player.chooseToDiscard(1, true);
            "step 1";
            player.changeHujia(1, null, true);
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
                return `回合结束时，${storage ? "你摸三张牌" : "所有角色弃置两张牌"}。`;
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
                    players[i].chooseToDiscard(2, true);
                }
            } else {
                player.draw(3);
            }
        }
    },

    zibao: {
        forced: true,
        frequent: true,
        trigger: {
            player: "phaseEnd"
        },
        async content(event, trigger, player) {
            const result = 
                await player.chooseControl("与上家交换座次", "与下家交换座次", "自爆！",).forResultControl();

            if (result == "与上家交换座次") {
                const preplayer = player.getPrevious();

                game.broadcastAll(function(target1, target2) {
                    game.swapSeat(target1, target2);
                }, player, player.getPrevious());
            } else if (result == "与下家交换座次") {
                const nextplayer = player.getNext();

                game.broadcastAll(function(target1, target2) {
                    game.swapSeat(target1, target2);
                }, player, player.getNext());

                nextplayer.insertPhase();
            } else {
                const targets = game.filterPlayer(function(current) {
                    return current != player && get.distance(current, player) <= 1;
                });

                for (let i = 0; i < targets.length; i++) {
                    targets[i].damage(5);
                }

                player.die();
            }
        },
        ai: {
            threaten: 8
        }
    },

    dusu: {
        group: ["dusu_1", "dusu_2"],
        subSkill: {
            1: {
                usable: 1,
                enable: "phaseUse",
                prompt: "选择一名角色，对其造成一点伤害并赋予其中毒I",
                filterTarget: lib.filter.notMe,
                content() {
                    "step 0";
                    target.damage();
                    "step 1";
                    target.addMark("poison");
                    "step 2";
                    target.addSkill("poison");
                }
            },
            2: {
                usable: 1,
                trigger: {
                    source: "damageSource"
                },
                filter(event, player) {
                    if (event._notrigger.includes(event.player)) {
                        return false;
                    }
                    return event.card && event.card.name == "sha" && event.player != player && event.player.isIn();
                },
                content() {
                    trigger.player.addMark("poison", 2);
                    trigger.player.addSkill("poison");
                }
            }
        }
    },
    qiantao: {
        usable: 1,
        forced: true,
        frequent: true,
        popup: false,
        trigger: {
            player: "damageBegin4"
        },
        logTarget: "player",
        filter(event, player) {
            return event.source.hasMark("poison");
        },
        content(event, trigger, player) {
            trigger.cancel();
        }
    },

    zhiliao: {
        forced: true,
        frequent: true,
        trigger: {
            player: "phaseZhunbeiBegin"
        },
        content(event, player) {
            player.recover(1);
        }
    },
    tongxin: {
        enable: "phaseUse",
        filter(event, player) {
            return player.countCards("h") > 0;
        },
        filterTarget(card, player, target) {
            return player != target && target.hasCard();
        },
        async content(event, player) {
            const result = await event.target.chooseCard("h", "展示一张手牌", true).forResult();

            if (result?.bool && result?.cards?.length) {
                const { cards } = result;
                await event.target.showCards(cards);
                const [card] = cards;
                for (let i = 0; i < 3; i++) {
                    await event.player.gain(get.discardPile(true));
                }

                const give = await event.player.chooseCard("h", "交给目标一张手牌", true).forResult();
                const count = 
                    Number(get.type(card) == get.type(give.cards[0])) 
                    + Number(get.name(card) == get.name(give.cards[0])) 
                    + Number(get.number(card) == get.number(give.cards[0])) 
                    + Number(get.suit(card) == get.suit(give.cards[0]));
                await event.player.give(give.cards, event.target);

                if (count == 0) {
                    event.player.chooseToDiscard(true, "h", event.player.countCards("h"));
                    event.player.tempBanSkill("tongxin");
                } else if (count == 1) {
                    event.player.draw();
                    event.player.tempBanSkill("tongxin");
                } else if (count == 2) {
                    event.player.draw(2);
                    event.player.tempBanSkill("tongxin");
                } else if (count == 3) {
                    event.player.draw(3);
                } else {
                    event.player.draw(4);
                    event.player.removeSkill("tongxin");
                    event.player.addSkill("tongxin_edit");
                }

                const give2 = await event.player.chooseCard("h", "交给目标一张手牌").forResult();
                await event.player.give(give2.cards, event.target);
            }
        }
    },
    tongxin_edit: {
        enable: "phaseUse",
        filter(event, player) {
            return player.countCards("h") > 0;
        },
        filterTarget(card, player, target) {
            return player != target && target.hasCard();
        },
        async content(event, player) {
            const result = await event.target.chooseCard("h", "展示一张手牌", true).forResult();

            if (result?.bool && result?.cards?.length) {
                const { cards } = result;
                await event.target.showCards(cards);
                const [card] = cards;
                for (let i = 0; i < 5; i++) {
                    await event.player.gain(get.discardPile(true));
                }

                const give = event.player.chooseCard("h", "交给目标一张手牌", true).forResult();
                const count = 
                    Number(get.type(card) == get.type(give.cards[0])) 
                    + Number(get.name(card) == get.name(give.cards[0])) 
                    + Number(get.number(card) == get.number(give.cards[0])) 
                    + Number(get.suit(card) == get.suit(give.cards[0]));
                await event.player.give(give2.cards, event.target);

                if (count == 0) {
                    event.player.chooseToDiscard(true, "h", event.player.countCards("h"));
                    event.player.tempBanSkill("tongxin");
                } else if (count == 1) {
                    event.player.draw();
                    event.player.tempBanSkill("tongxin");
                } else if (count == 2) {
                    event.player.draw(2);
                    event.player.tempBanSkill("tongxin");
                } else if (count == 3) {
                    event.player.draw(3);
                } else {
                    event.player.draw(4);
                }

                const give2 = event.player.chooseCard("h", "交给目标一张手牌").forResultCard();
                await event.player.give(give2.cards, event.target);
            }
        }
    }
};

export default skills;