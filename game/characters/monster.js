/**
 * game/character/monster.js
 * 
 * What it Does:
 *   This file is a basic monster character
 *   it extends the imageSprite class and adds two collision detections methods
 * 
 * What to Change:
 *   Add any character specific methods
 *   eg. eat
 * 
 */

import ImageSprite from '../objects/imageSprite.js';

class Monster extends ImageSprite {
    constructor(options) {
        super(options);
    }
}

export default Monster;