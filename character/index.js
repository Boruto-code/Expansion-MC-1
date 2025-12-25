import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import characters from "./character.js";
import pinyins from "./pinyin.js";
import skills from "./skill.js";
import translates from "./translate.js";
import characterIntros from "./intro.js";
import characterFilters from "./characterFilter.js";
import characterSubstitutes from "./characterSubstitute.js";
import { characterSort, characterSortTranslate } from "./sort.js";

game.import("character", function() {
    return {
        name: "mc1",
        connect: true,
        character: { ...characters },
        characterSort: { mc1: characterSort },
        characterFilter: { ...characterFilters },
        characterIntro: { ...characterIntros },
        characterSubstitutes: { ...characterSubstitutes },
        skill: { ...skills },
        translate: { ...translates, ...characterSortTranslate },
        pinyins: { ...pinyins }
    };
});