import { lib, game, ui, get, ai, _status } from "../../../noname.js";

/** @type { importCharacterConfig['skill'] } */
const skills = {
    poison: {
        mark: true,
        marktext: "毒",
        intro: {
            name: "中毒",
            content: "拥有“毒”标记的角色回合开始时，失去一点体力（若体力为1，则不执行）并移去1枚“毒”标记。",
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
        marktext: "裂",
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
            return event.card.name == "sha" && player.countExpansions("fenlie") > 0;
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
                            trigger.getParent().baseDamage++;
                        } else if (suit == "spade") {
                            trigger.target.turnOver();
                        } else if (suit == "heart") {
                            trigger.getParent().baseDamage += Math.floor(trigger.target.maxHp / 2);
                        } else {
                            player.discardPlayerCard("he", trigger.target, true);
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
                const result = 
                    await player.chooseControl("失去一点体力", "弃置两张牌", function(event, player) {
                        if (player.hp > 2) {
                            return "失去一点体力";
                        } else {
                            return "弃置两张牌";
                        }
                    }).set("prompt", "日：失去一点体力或弃置两张牌").forResult();

                if (result.control == "失去一点体力") {
                    player.loseHp();
                } else {
                    player.chooseToDiscard(2, true);
                }
            } else {
                const result = 
                    await player.chooseControl("回复一点体力", "摸两张牌", function(event, player) {
                        if (player.hp == player.maxHp) {
                            return "摸两张牌";
                        } else {
                            return "回复一点体力";
                        }
                    }).set("prompt", "夜：回复一点体力或摸两张牌").forResult();

                if (result.control == "回复一点体力") {
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
            await player.changeGroup("qun");
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
        derivation: "mcyuanji",
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
                    player.addSkill("mcyuanji");
                    player.disableEquip(1);
                }
            })
        }
    },
    mcyuanji: {
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
                const result = 
                    await player.chooseControl("回复一点体力", "摸一张牌", function(event, player) {
                        if (player.hp > 2) {
                            return "回复一点体力";
                        } else {
                            return "摸一张牌";
                        }
                    }).set("prompt", "日：回复一点体力或摸一张牌").forResult();

                if (result.control == "回复一点体力") {
                    player.recover();
                } else {
                    player.draw();
                }
            } else {
                const result = 
                    await player.chooseControl("回复一点体力", "摸两张牌", function(event, player) {
                        if (player.hp == player.maxHp) {
                            return "摸两张牌";
                        } else {
                            return "回复一点体力";
                        }
                    }).set("prompt", "夜：回复一点体力或摸两张牌").forResult();

                if (result.control == "回复一点体力") {
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

                preplayer.turnOver();
            } else if (result == "与下家交换座次") {
                const nextplayer = player.getNext();

                game.broadcastAll(function(target1, target2) {
                    game.swapSeat(target1, target2);
                }, player, player.getNext());

                nextplayer.insertPhase();
            } else {
                const targets = game.filterPlayer(function(current) {
                    return current != player && get.distance(player, current) <= 1;
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
                prompt: "选择一名其他角色，对其造成一点伤害并赋予其中毒I",
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
            return event.source.hasMark("poison") && !event.player.hasSkill("qiantao_used");
        },
        content(event, trigger, player) {
            trigger.cancel();
            player.addTempSkill("qiantao_used");
        },
        subSkill: {
            used: { charlotte: true }
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
        async content(event, trigger, player) {
            const result = await event.target.chooseCard("h", "展示一张手牌", true).forResult();

            if (result?.bool && result?.cards?.length) {
                const { cards } = result;
                await event.target.showCards(cards);
                const [card] = cards;
                for (let i = 0; i < 3; i++) {
                    await player.gain(get.discardPile(true));
                }

                const give = await player.chooseCard("h", "交给目标一张手牌", true).forResult();
                const count = 
                    Number(get.type(card) == get.type(give.cards[0])) 
                    + Number(get.name(card) == get.name(give.cards[0])) 
                    + Number(get.number(card) == get.number(give.cards[0])) 
                    + Number(get.suit(card) == get.suit(give.cards[0]));
                await player.give(give.cards, event.target);

                if (count == 0) {
                    player.chooseToDiscard(true, "h", player.countCards("h"));
                    player.tempBanSkill("tongxin");
                } else if (count == 1) {
                    player.draw();
                    player.tempBanSkill("tongxin");
                } else if (count == 2) {
                    player.draw(2);
                    player.tempBanSkill("tongxin");
                } else if (count == 3) {
                    player.draw(3);
                } else {
                    player.draw(4);
                    player.removeSkill("tongxin");
                    player.addSkill("tongxin_edit");
                }

                const give2 = await player.chooseCard("h", "交给目标一张手牌").forResult();
                await player.give(give2.cards, event.target);
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
        async content(event, trigger, player) {
            const result = await event.target.chooseCard("h", "展示一张手牌", true).forResult();

            if (result?.bool && result?.cards?.length) {
                const { cards } = result;
                await event.target.showCards(cards);
                const [card] = cards;
                for (let i = 0; i < 5; i++) {
                    await player.gain(get.discardPile(true));
                }

                const give = player.chooseCard("h", "交给目标一张手牌", true).forResult();
                const count = 
                    Number(get.type(card) == get.type(give.cards[0])) 
                    + Number(get.name(card) == get.name(give.cards[0])) 
                    + Number(get.number(card) == get.number(give.cards[0])) 
                    + Number(get.suit(card) == get.suit(give.cards[0]));
                await player.give(give2.cards, event.target);

                if (count == 0) {
                    player.chooseToDiscard(true, "h", player.countCards("h"));
                    player.tempBanSkill("tongxin");
                } else if (count == 1) {
                    player.draw();
                    player.tempBanSkill("tongxin");
                } else if (count == 2) {
                    player.draw(2);
                    player.tempBanSkill("tongxin");
                } else if (count == 3) {
                    player.draw(3);
                } else {
                    player.draw(4);
                }

                const give2 = player.chooseCard("h", "交给目标一张手牌").forResult();
                await player.give(give2.cards, event.target);
            }
        }
    },

    chuangshi: {
        group: ["chuangshi_1", "chuangshi_2", "chuangshi_3", "chuangshi_4", "chuangshi_5", "chuangshi_6", "chuangshi_7", "chuangshi_8", "chuangshi_9"],
        subSkill: {
            1: {
                usable: 1,
                enable: "phaseUse",
                async content(event, trigger, player) {
                    await player.gain(get.discardPile(true));
                }
            },
            2: {
                usable: 1,
                enable: "phaseUse",
                filter(event, player) {
                    return player.countCards("h") > 0;
                },
                async content(event, trigger, player) {
                    const result = await player.chooseCard("h", "将一张手牌置于牌堆顶", true).forResult();
                    await player.lose(result.cards, ui.cardPile, "invisible", "insert");
                }
            },
            3: {
                usable: 1,
                enable: "phaseUse",
                filter(event, player) {
                    return player.countCards("h") > 0;
                },
                filterTarget: lib.filter.notMe,
                async content(event, trigger, player) {
                    const result = await player.chooseCard("h", "交给目标一张牌", true).forResult();
                    await player.give(result.cards, event.target);
                }
            },
            4: {
                usable: 1,
                enable: "phaseUse",
                filter(event, player) {
                    return player.countCards("h") > 0;
                },
                content(event, trigger, player) {
                    "step 0";
                    const result = player.chooseCard("h", "将一张手牌置于武将牌上", true).forResult();
                    "step 1";
                    player.addToExpansion(result.cards, player, "giveAuto").gaintag.add("chuangshi_4");
                },
                marktext: "物",
                intro: {
                    content: "expansion",
                    markcount: "expansion",
                }
            },
            5: {
                usable: 1,
                enable: "phaseUse",
                filter(event, player) {
                    return player.countExpansions("chuangshi_4") > 0;
                },
                async content(event, trigger, player) {
                    const result = await player
                            .chooseCardButton(player.getExpansions("chuangshi_4"), [1, player.countExpansions("chuangshi_4")], "选择收回任意张“物”", true)
                            .forResult();
                    
                    await player.gain(result.links);
                }
            },
            6: {
                usable: 1,
                enable: "phaseUse",
                async content(event, trigger, player) {
                    await player.draw();
                }
            },
            7: {
                usable: 1,
                enable: "phaseUse",
                async content(event, trigger, player) {
                    await player.chooseToGuanxing(5).set("prompt", "探索：点击或拖动将牌移动到牌堆顶或牌堆底");
                    await player.draw();
                }
            },
            8: {
                usable: 1,
                enable: "phaseUse",
                filter(event, player) {
                    return player.countCards("h");
                },
                async content(event, trigger, player) {
                    const result = await player.chooseCard([1, 2], "h", "选择合成手牌", true).forResult();
                    const card1 = result.cards[0];
                    const suit = get.suit(card1, player),
                        number = get.number(card1, player);
                    
                    let name, nature = null;

                    await player.discard(result.cards);

                    if (result.cards.length == 1) {
                        switch (get.name(card1, player)) {
                            case "sha":
                                if (get.nature(card1, player) == "fire") {
                                    name = "huogong";
                                } else {
                                    name = "shan";
                                }
                                break;
                            case "shan":
                                name = "sha";
                                break;
                            case "tao":
                                name = "jiu";
                                break;
                            case "jiu":
                                name = "tao";
                                break;
                            case "shandian":
                                name = "sha";
                                nature = "thunder";
                                break;
                            case "huogong":
                                name = "sha";
                                nature = "fire";
                                break;
                            case "nanman":
                                name = "wanjian";
                                break;
                            case "wanjian":
                                name = "nanman";
                                break;
                            case "guohe":
                                name = "shunshou";
                                break;
                            case "shunshou":
                                name = "guohe";
                                break;
                            case "taoyuan":
                                name = "wugu";
                                break;
                            case "wugu":
                                name = "taoyuan";
                                break;
                            case "wuzhong":
                                let list = [];
                                for (let card of lib.inpile) {
                                    if (get.type(card) == "trick") {
                                        list.push(["锦囊", "", card]);
                                    }
                                }
                                const result = await player
                                    .chooseButton(["合成：转化成任意一张普通锦囊牌", [list, "vcard"]], false)
                                    .forResult();
                                name = result.links[0][2];
                                break;
                            default:
                                name = "tao";
                        }
                    } else {
                        if (get.name(card1, player) == "wugu" && get.name(result.cards[1], player) == "wuxie") {
                            name = "bingliang";
                        } else if (get.name(card1, player) == "wuxie" && get.name(result.cards[1], player) == "wuxie") {
                            let list = [];
                            for (let card of lib.inpile) {
                                if (get.type(card) == "trick") {
                                    list.push(["锦囊", "", card]);
                                }
                            }
                            const result = await player
                                .chooseButton(["合成：转化成任意一张普通锦囊牌", [list, "vcard"]], false)
                                .forResult();
                            name = result.links[0][2];
                        } else {
                            name = "wuxie";
                        }
                    }

                    const copy = await game.createCard2(name, suit, number, nature);
                    await player.gain(copy);
                }
            },
            9: {
                usable: 1,
                enable: "phaseUse",
                filter(event, player) {
                    return player.countCards("h") > 0;
                },
                async content(event, trigger, player) {
                    const result = await player
                        .chooseControl("雷", "火", "迫", "刺", "速", "迅", "锋", "坚", "重", "退")
                        .forResult();
                    if (result.control == "雷") {
                        await player.chooseToDiscard(1, true);
                        await player.addTempSkill("chuangshi_effect_1");
                    } else if (result.control == "火") {
                        await player.chooseToDiscard(1, true);
                        await player.addTempSkill("chuangshi_effect_2");
                    } else if (result.control == "迫") {
                        await player.chooseToDiscard(1, true);
                        await player.addTempSkill("chuangshi_effect_3");
                    } else if (result.control == "刺") {
                        await player.chooseToDiscard(1, true);
                        await player.addTempSkill("chuangshi_effect_4");
                    } else if (result.control == "速") {
                        await player.chooseToDiscard(1, true);
                        await player.addTempSkill("chuangshi_effect_5");
                    } else if (result.control == "迅") {
                        await player.chooseToDiscard(2, true);
                        await player.addTempSkill("chuangshi_effect_6");
                    } else if (result.control == "锋") {
                        await player.chooseToDiscard(2, true);
                        await player.addTempSkill("chuangshi_effect_7");
                    } else if (result.control == "坚") {
                        await player.chooseToDiscard(2, true);
                        await player.addTempSkill("chuangshi_effect_8");
                    } else if (result.control == "重") {
                        await player.chooseToDiscard(2, true);
                        await player.addTempSkill("chuangshi_effect_9");
                    } else if (result.control == "退") {
                        await player.chooseToDiscard(3, true);
                        await player.addTempSkill("chuangshi_effect_10");
                    }
                }
            },
            effect_1: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    source: "damageBegin1"
                },
                filter(event, player) {
                    return event.card.name == "sha";
                },
                async content(event, trigger, player) {
                    game.setNature(trigger, "thunder");
                }
            },
            effect_2: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    source: "damageBegin1"
                },
                filter(event, player) {
                    return event.card.name == "sha";
                },
                async content(event, trigger, player) {
                    game.setNature(trigger, "fire");
                }
            },
            effect_3: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    player: "useCard"
                },
                filter(event, player) {
                    return event.card.name == "sha";
                },
                async content(event, trigger, player) {
                    await player.draw(2);
                }
            },
            effect_4: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    player: "useCardToPlayered"
                },
                filter(event, player) {
                    return event.card.name == "sha" && event.target.countCards("h") > 0;
                },
                async content(event, trigger, player) {
                    await player.discardPlayerCard(trigger.target, "he", true);
                }
            },
            effect_5: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    player: "useCardToEnd"
                },
                filter(event, player) {
                    return event.card.name == "sha";
                },
                async content(event, trigger, player) {
                    await player.removeSkill("chuangshi_effect_5");
                },
                mod: {
                    targetInRange(card) {
                        if (card.name == "sha") {
                            return true;
                        }
                    }
                }
            },
            effect_6: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    player: "useCardToPlayered"
                },
                filter(event, player) {
                    return event.card.name == "sha";
                },
                async content(event, trigger, player) {
                    await trigger.getParent().directHit.add(trigger.target);
                }
            },
            effect_7: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    source: "damageBegin1"
                },
                filter(event, player) {
                    return event.card.name == "sha";
                },
                async content(event, trigger, player) {
                    trigger.num++;
                }
            },
            effect_8: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    player: "useCardAfter"
                },
                filter(event, player) {
                    return event.card.name == "sha";
                },
                async content(event, trigger, player) {
                    await player.gain(trigger.card, "gain2");
                }
            },
            effect_9: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    player: "useCardToEnd"
                },
                filter(event, player) {
                    return event.card.name == "sha";
                },
                async content(event, trigger, player) {
                    await player.removeSkill("chuangshi_effect_9");
                },
                mod: {
                    selectTarget(card, player, range) {
                        range[1]++;
                    }
                }
            },
            effect_10: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    source: "damageEnd"
                },
                filter(event, player) {
                    return event.card.name == "sha";
                },
                async content(event, trigger, player) {
                    await trigger.player.turnOver();
                }
            }
        }
    },
    bengkui: {
        mark: true,
        limited: true,
        unique: true,
        init(player) {
            player.storage.bengkui = false;
        },
        trigger: {
            player: "dying"
        },
        async content(event, trigger, player) {
            await player.awakenSkill("bengkui");
            const players = game.filterPlayer();
                
            for (let i = 0; i < players.length; i++) {
                await players[i].addSkillBlocker("bengkui");
                await players[i].addSkill("bengkui_ban");
                await players[i].discard(players[i].getCards("hej"));
                await players[i].draw(4);

                const delt = players[i].getHp(true) - 1;
                if (delt > 0) {
                    await players[i].loseHp(delt);
                } else if (delt < 0) {
                    await players[i].recover(-delt);
                }
            }
            await player.changeGroup("shen");
            player.changeSkin("bengkui", "steve_infinity");
            await player.addSkill("bengkui_effect");
            player.storage.bengkui = true;
        },
        skillBlocker(skill, player) {
            return !lib.skill[skill].charlotte && !lib.skill[skill].persevereSkill;
        },
        
        subSkill: {
            effect: {
                charlotte: true,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    player: "phaseBegin"
                },
                content() {
                    let winners = player.getFriends();
                    game.over(player == game.me || winners.includes(game.me));
                }
            },
            ban: {
                charlotte: true,
                mod: {
                    cardEnabled(card, player) {
                        if (card.name == "tao" || card.name == "taoyuan") {
                            return false;
                        }
                    }
                }
            }
        }
    },
    
    jianxiao: {
        usable: 1,
        enable: "phaseUse",
        prompt: "弃置所有手牌并选择一名其他角色",
        filterTarget: lib.filter.notMe,
        filter(event, player) {
            return player.countCards("h") > 0;
        },
        async content(event, trigger, player) {
            const cards = player.countCards("h");
            await player.discard(player.getCards("h"));
            const result = await event.target
                .chooseToDiscard("he", `弃置${get.cnNumber(cards + 1)}张牌或受到2点伤害`, cards + 1)
                .set("ai", function(card) {
                    if (get.type(card) != "basic") {
                        return 10 - get.value(card);
                    }
                    return 8 - get.value(card);
                })
                .forResult();
            "step 3";
            if (!result.bool) {
                await event.target.damage(2);
            }
        },
        check(event, player) {
            let enemies = game.countPlayer(function(current) {
                return get.attitude(player, current) < 0 && current.countCards("h") > 0;
            });
            if (enemies < 1) {
                return false;
            }
            return true;
        }
    },
    huixiang: {
        usable: 1,
        enable: "phaseUse",
        async content(event, trigger, player) {
            const players = game.filterPlayer(function(current) {
                return current.countCards("h") > 0;
            });
            let numbers = [];
            let maxs = 0, max = 0, min = 14;
            let maxplayer, minplayers = [];
                
            for (let target of players) {
                const result = await target
                    .chooseToDiscard(1, true)
                    .set("ai", function(card) {
                        return get.number(card) + (10 - get.value(card)) * 0.2;
                    })
                    .forResult();
                numbers.push(get.number(result.cards));
                if (get.number(result.cards) == max || maxs == 0) {
                    maxs++;
                }
                if (get.number(result.cards) > max) {
                    max = get.number(result.cards);
                    maxplayer = target;
                }
                if (get.number(result.cards) < min) {
                    min = get.number(result.cards);
                }
            }

            if (maxs == 1) {
                for (let target of players) {
                    if (target != maxplayer) {
                        await target.damage(maxplayer);
                    }
                }

                const result = await player
                    .chooseTarget(1, false, "选择一名没赢的其他角色赋予黑暗", (card, player, target) => {
                        return target != player && target != maxplayer && players.indexOf(target) != -1;
                    })
                    .forResult();

                if (result.bool) {
                    await result.targets[0].addTempSkill("heian", { player: "phaseEnd" });
                }
            } else {
                for (let i = 0; i < players.length; i++) {
                    if (numbers[i] > min) {
                        await players[i].chooseToDiscard(2, true);
                    }
                }
            }
        },
        ai: {
            damage: true,
            result: {
                target(player, target) {
                    return get.damageEffect(target, player);
                }
            },
            threaten: 1.6,
            expose: 0.4
        }
    },
    heian: {
        persevereSkill: true,
        forced: true,
        frequent: true,
        trigger: {
            player: "useCardAfter"
        },
        filter(event, player) {
            return player.isPhaseUsing();
        },
        async content(event, trigger, player) {
            await player.chooseToDiscard(1, true);
        },
        mod: {
            maxHandcardBase(player, num) {
                return num - 5;
            },
            cardEnabled(card, player) {
                if (get.type(card) == "equip") {
                    return false;
                }
            }
        }
    }
};

export default skills;