import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import characterSubstitutes from "../character/characterSubstitute.js";

export function content(config, pack) {
    lib.characterSubstitute = { ...characterSubstitutes };
}