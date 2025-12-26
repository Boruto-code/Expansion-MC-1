import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import characterSubstitutes from "./character/characterSubstitute.js";

export function content(config, pack) {
    lib.group.push("wang");
	lib.translate.wang = "亡";
    lib.characterSubstitute = { ...characterSubstitutes };
}