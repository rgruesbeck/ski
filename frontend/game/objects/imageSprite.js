/**
 * game/objects/imageSprite.js
 * 
 * What it Does:
 *   This file is a basic image sprite it extends the sprite class
 *   and draws an image to the screen
 * 
 * What to Change:
 *   Add any new methods you want all your
 *   game characters that are also sprites to have.
 *   eg. 
 * 
 */

import Sprite from './sprite.js';

class ImageSprite extends Sprite {
    constructor(options) {
        super(options);

        this.ctx = options.ctx;
        this.image = options.image;
        this.imagekey = options.imagekey;
        this.imageCache = options.imageCache;
    }

    draw() {
        let img = {
            image: this.image,
            key: this.imagekey,
            width: this.width,
            height: this.height
        };

        if (this.imageCache && this.imageCache.has(img)) {
            let imageData = this.imageCache.get(img);

            // dump cached image
            this.ctx.putImageData(imageData, this.x >> 0, this.y >> 0);
        } else {
            this.freshDraw();

            // cache image
            if (this.imageCache) {
                this.imageCache.set(img);
            }
        }
    }

    freshDraw() {
        // save canvas context
        this.ctx.save();

        // code for flipping image to match direction
        let scaleX = this.direction === 'left' ? -1 : 1;
        let xPosition = this.direction === 'left' ? -1 * this.x : this.x;
        let trX = this.direction === 'left' ? this.width : 0;

        this.ctx.translate(trX, 0);
        this.ctx.scale(scaleX, 1);

        // draw the image to canvas
        this.ctx.drawImage(this.image,
            xPosition >> 0,
            this.y >> 0,
            this.width,
            this.height);

        // restore canvas context
        this.ctx.restore();
    }

}

export default ImageSprite;