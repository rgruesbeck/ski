/** * game/main.js
 * 
 *   What it Does:
 *   This file is the main game class
 *   Important parts are the load, create, and play functions
 *   
 *   Load: is where images, sounds, and fonts are loaded
 *   
 *   Create: is where game elements and characters are created
 *   
 *   Play: is where game characters are updated according to game play
 *   before drawing a new frame to the screen, and calling play again
 *   this creates an animation just like the pages of a flip book
 * 
 *   Other parts include boilerplate for requesting and canceling new frames
 *   handling input events, pausing, muting, etc.
 * 
 *  What to Change:
 *   Most things to change will be in the play function
 */

import Koji from 'koji-tools';

import {
    requestAnimationFrame,
    cancelAnimationFrame
} from './helpers/animationFrame.js';

import {
    loadList,
    loadImage,
    loadSound,
    loadFont
} from 'game-asset-loader';

import audioContext from 'audio-context';
import audioPlayback from 'audio-play';
import unlockAudioContext from 'unlock-audio-context';

import preventParent from 'prevent-parent';
import imageCache from 'canvas-cache';

import {
    hashCode,
    randomBetween,
    bounded,
    throttled
} from './utils/baseUtils.js';

import {
    resize
} from './utils/imageUtils.js';

import {
    getDistance
} from './utils/spriteUtils.js';

import {
    canvasInputPosition,
    onSwipe
} from './utils/inputUtils.js';

import {
    Spark,
    Burn,
    BlastWave,
    StarStream
} from './objects/effects.js';

import Player from './characters/player.js';
import Monster from './characters/monster.js';
import Obstacle from './characters/obstacle.js';
import { collideDistance } from './utils/spriteUtils.js';


class Game {

    constructor(canvas, overlay, topbar, config) {
        this.config = config; // customization
        this.overlay = overlay; // overlay

        // set topbar
        this.topbar = topbar;
        this.topbar.active = config.settings.gameTopBar;

        // prevent parent window form scrolling
        preventParent();

        // set playstyle: lanes or open
        this.playStyle = config.settings.playStyle;
        this.gamePlay = {
            ...config[this.playStyle]
        };

        this.prefix = hashCode(this.config.settings.name); // set prefix for local-storage keys

        this.canvas = canvas; // game screen
        this.ctx = canvas.getContext('2d'); // game screen context

        // create image cache
        this.imageCache = imageCache();

        this.audioCtx = audioContext(); // create new audio context
        unlockAudioContext(this.audioCtx);
        this.playlist = [];

        // setup throttled functions
        this.incrementLife = throttled(1200, () => this.state.lives += 1);
        this.decrementLife = throttled(1200, () => this.state.lives -= 1);
        this.monsterKill = throttled(200, () => this.state.lives -= 1);

        this.throttledBurn = throttled(600, (brn) => new Burn(brn));
        this.throttledBlastWave = throttled(600, (bw) => new BlastWave(bw));
        this.throttledSpark = throttled(300, (br) => new Spark(br));

        this.throttledBoost = throttled(600, () => this.boost());
        this.throttledPlayback = throttled(600, (key, buffer) => this.playback(key, buffer));

        // setup event listeners
        // handle keyboard events
        document.addEventListener('keydown', ({ code }) => this.handleKeyboardInput('keydown', code));
        document.addEventListener('keyup', ({ code }) => this.handleKeyboardInput('keyup', code));

        // handle taps
        // document.addEventListener('touchstart', (e) => this.handleTap('start', e));
        // document.addEventListener('touchend', (e) => this.handleTap('end', e));

        // handle swipes
        document.addEventListener('touchstart', ({ touches }) => this.handleSwipe('touchstart', touches[0]));
        document.addEventListener('touchmove', ({ touches }) => this.handleSwipe('touchmove', touches[0]));
        document.addEventListener('touchend', ({ touches }) => this.handleSwipe('touchend', touches[0]));

        // handle overlay clicks
        this.overlay.root.addEventListener('click', (e) => this.handleClicks(e));

        // restart game loop after tab unfocused
        // window.addEventListener('blur', () => this.requestFrame(() => this.play()));
        
        // handle koji config changes
        Koji.on('change', (scope, key, value) => {
            this.config[scope][key] = value;
            this.cancelFrame(this.frame.count - 1);
            this.load();
        });
    }

    init() {
        // set canvas width and height
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        // set screen
        this.setScreen();

        // frame count, rate, and time
        // this is just a place to keep track of frame rate (not set it)
        this.frame = {
            count: 0,
            time: Date.now(),
            rate: null,
            scale: null
        };

        // game settings
        this.state = {
            current: 'loading',
            prev: '',
            lanes: this.gamePlay.lanes ? parseInt(this.gamePlay.lanes) : null,
            playerLane: this.gamePlay.lanes ? parseInt(this.gamePlay.lanes) /  2 >> 0 : null,
            laneSize: this.gamePlay.lanes ? Math.floor(this.canvas.width / parseInt(this.gamePlay.lanes)) : null,
            gameSpeed: parseInt(this.config.settings.gameSpeed),
            attackFrames: 0,
            attackLength: parseInt(this.config.settings.attackLength) * 60,
            boost: 1,
            score: 0,
            lives: parseInt(this.config.settings.lives),
            paused: false,
            muted: localStorage.getItem(this.prefix.concat('muted')) === 'true'
        };

        this.input = {
            left: false,
            right: false
        };

        this.images = {}; // place to keep images
        this.sounds = {}; // place to keep sounds
        this.fonts = {}; // place to keep fonts

        this.lanes = []; // lanes
        this.effects = []; // effects
        this.entities = []; // entities (obstacles, powerups)
        this.player = {}; // player

        // set topbar and topbar color
        this.topbar.active = this.config.settings.gameTopBar;
        this.topbar.style.display = this.topbar.active ? 'block' : 'none';
        this.topbar.style.backgroundColor = this.config.colors.tertiaryColor;


        // set document body to backgroundColor
        document.body.style.backgroundColor = this.config.colors.backgroundColor;

        // set loading indicator to textColor
        document.querySelector('#loading').style.color = this.config.colors.textColor;

    }

    load() {
        // load pictures, sounds, and fonts
        this.init();


        // make a list of assets
        const gameAssets = [
            loadImage('playerImage', this.config.images.playerImage),
            loadImage('monsterImage', this.config.images.monsterImage),
            loadImage('obstacleImage', this.config.images.obstacleImage),
            loadImage('lifeImage', this.config.images.lifeImage),
            loadImage('backgroundImage', this.config.images.backgroundImage, { optional: true }),
            loadSound('backgroundMusic', this.config.sounds.backgroundMusic),
            loadSound('powerUpSound', this.config.sounds.powerUpSound),
            loadSound('turnSound', this.config.sounds.turnSound),
            loadSound('boostSound', this.config.sounds.boostSound),
            loadSound('crashSound', this.config.sounds.crashSound),
            loadSound('powerSound', this.config.sounds.powerSound),
            loadSound('monsterSound', this.config.sounds.monsterSound),
            loadSound('attackSound', this.config.sounds.attackSound),
            loadSound('gameOverSound', this.config.sounds.gameOverSound),
            loadFont('gameFont', this.config.settings.fontFamily)
        ];

        // put the loaded assets the respective containers
        loadList(gameAssets, (progress) => {

            if (document) {
                document.getElementById('loading-progress').textContent = `${progress.percent}%`;
            }
        })
        .then((assets) => {

            this.images = assets.image;
            this.sounds = assets.sound;

        })
        .then(() => this.create())
        .catch(err => console.error(err));
    }

    create() {
        // create game characters
        const { playerImage, obstacleImage } = this.images;

        // set player size for open and lane style game play
        let playerWidthLanes = this.state.laneSize;
        let playerWidthOpen = bounded(this.gamePlay.playerSize * this.screen.scaleHeight, this.screen.minSize, this.screen.maxSize);
        this.playerSize = resize({
            image: playerImage,
            width: this.gamePlay.lanes ? playerWidthLanes : playerWidthOpen
        });


        let playerX = this.gamePlay.lanes ?
        this.state.playerLane * this.state.laneSize :
        this.screen.centerX;

        // create player
        this.player = new Player({
            ctx: this.ctx,
            image: playerImage,
            x: playerX,
            y: this.screen.bottom,
            width: this.playerSize.width,
            height: this.playerSize.height,
            speed: this.playerSize.width,
            bounds: this.screen
        });

        // create monster
        let monsterScale = 2;
        this.monster = new Monster({
            ctx: this.ctx,
            image: this.images.monsterImage,
            x: this.screen.centerX,
            y: this.screen.top - this.playerSize.height * monsterScale,
            width: this.playerSize.width * monsterScale,
            height: this.playerSize.height * monsterScale,
            speed: this.playerSize.width / 5,
            bounds: { ...this.screen, ...{ top: -500 } }
        });

        // set obstacle size for open and lane style game play
        let obstacleWidthLanes = this.state.laneSize;
        let obstacleWidthOpen = bounded(this.gamePlay.obstacleSize * this.screen.scaleHeight, this.screen.minSize, this.screen.maxSize);
        this.obstacleSize = resize({
            image: obstacleImage,
            width: this.gamePlay.lanes ? obstacleWidthLanes : obstacleWidthOpen
        });

        // set overlay styles
        this.overlay.setStyles({...this.config.colors, ...this.config.settings});

        this.setState({ current: 'ready' });
        this.play();
    }

    play() {
        // update game characters

        // clear the screen of the last picture
        this.ctx.fillStyle = this.config.colors.backgroundColor; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // draw and do stuff that you need to do no matter the game state
        this.ctx.drawImage(this.images.backgroundImage, 0, 0, this.ctx.width, this.ctx.height);

        // update score and lives
        this.overlay.setLives(this.state.lives);
        this.overlay.setScore(this.state.score);

        // ready to play
        if (this.state.current === 'ready') {

            // display menu after loading or game over
            if (this.state.prev.match(/loading|over/)) {
                this.overlay.hide('loading');
                this.canvas.style.opacity = 1;

                this.overlay.setBanner(this.config.settings.name);
                this.overlay.setButton(this.config.settings.startText);
                this.overlay.setInstructions({
                    desktop: this.config.settings.instructionsDesktop,
                    mobile: this.config.settings.instructionsMobile
                });

                this.overlay.show('stats');

                this.overlay.setMute(this.state.muted);
                this.overlay.setPause(this.state.paused);

                this.setState({ current: 'ready' });
            }

        }

        // game play
        if (this.state.current === 'play') {

            // if last state was 'ready'
            // hide overlay items
            if (this.state.prev === 'ready') {
                this.overlay.hide(['banner', 'button', 'instructions'])

                // start star stream
                this.effects.push(new StarStream({
                    ctx: this.ctx,
                    n: 100,
                    x: [0, this.canvas.width],
                    y: this.screen.bottom,
                    vx: 0,
                    vy: (this.state.gameSpeed / 5) * -1, // game background speed
                    rd: [2, 3],
                    color: this.config.colors.streamColor
                }))

                // power up sound
                this.playback('powerUpSound', this.sounds.powerUpSound);
                this.setState({ current: 'play' });
            }

            if (!this.state.muted && !this.state.backgroundMusic) {
                this.state.backgroundMusic = true;
                this.playback('backgroundMusic', this.sounds.backgroundMusic, {
                    start: 0,
                    end: this.sounds.backgroundMusic.duration,
                    loop: true,
                    context: this.audioCtx
                });
            }


            // add an obstacle
            let shouldAddObstacle = this.frame.count % 120 === 0 && // 2 seconds have gone by
            this.entities.length < Math.min(this.frame.count / 300, 6); // less than some number of obstacles ( max is 6 )

            if (shouldAddObstacle) {
                // pick a location
                let obstacleLane = randomBetween(0, this.state.lanes - 1, true);
                let location = {
                    x: this.state.laneSize * obstacleLane,
                    y: this.screen.bottom + this.obstacleSize.height
                };

                // ignore crowded locations
                let inValidLocation = this.entities.some((ent) => {
                    return getDistance(ent, location) < this.playerSize.width * 3;
                });


                if (!inValidLocation) {
                    // add new obstacle
                    // let { obstacleImage } = this.images;
                    // let obstacleType = 'tree';
                    let obstacleImage, obstacleType, obstacleSize;
                    if (this.frame.count % 23 === 0) {
                        obstacleImage = this.images.lifeImage;
                        obstacleType = 'coffee';

                        obstacleSize = resize({
                            image: obstacleImage,
                            width: this.gamePlay.lanes ? this.state.laneSize / 2 : this.obstacleSize.width
                        });

                    } else {
                        obstacleImage = this.images.obstacleImage;
                        obstacleType = 'tree';

                        obstacleSize = resize({
                            image: obstacleImage,
                            width: this.gamePlay.lanes ? this.state.laneSize : this.obstacleSize.width
                        });
                    }


                    this.entities.push(new Obstacle({
                        ctx: this.ctx,
                        image: obstacleImage,
                        imagekey: 'obstacleImage',
                        imageCache: this.imageCache,
                        type: obstacleType,
                        lane: this.gamePlay.lanes ? obstacleLane : null,
                        x: location.x,
                        y: location.y,
                        width: obstacleSize.width,
                        height: obstacleSize.height,
                        speed: this.state.gameSpeed,
                        bounds: this.screen
                    }))
                }
            }

            // begin monster attack
            if (this.frame.count % 1800 === 0 && !this.monster.attacking) {

                this.state.attackFrames = 0;
                this.monster.attacking = true;


                this.playback('monsterSound', this.sounds.monsterSound);
            }

            // monster is tired
            if (this.state.attackFrames > this.state.attackLength) {
                this.monster.attacking = false;
            }


            for (let i = 0; i < this.entities.length; i++) {
                let entity = this.entities[i];

                // move entity down
                entity.move(0, -1, this.frame.scale);
                entity.draw();

                // check for player collisions
                let collision = this.gamePlay.lanes ?
                entity.lane === this.state.playerLane && collideDistance(entity, this.player) :
                collideDistance(entity, this.player);

                if (collision && entity.type === 'tree') {
                    // handle tree collision

                    // decrement life
                    this.decrementLife();
                    entity.active = false;

                    // burst effect
                    let spark = this.throttledSpark({
                        ctx: this.ctx,
                        n: 20,
                        x: this.player.cx,
                        y: this.player.cy,
                        vx: [-5, 5],
                        vy: [-5, -1],
                        color: this.config.colors.trailColor,
                        burnRate: 0.005
                    });

                    spark && this.effects.push(spark);

                    let burn = this.throttledBurn({
                        ctx: this.ctx,
                        x: this.player.cx,
                        y: this.player.cy,
                        color: this.config.colors.crashColor
                    });

                    if (burn) {
                      this.effects.push(burn);

                      this.playback('crashSound', this.sounds.crashSound);
                    }
                }

                if (collision && entity.type === 'coffee') {
                    // handle coffee collision

                    // increment life
                    this.incrementLife();
                    entity.active = false;

                    let burn = this.throttledBurn({
                        ctx: this.ctx,
                        x: this.player.cx,
                        y: this.player.cy,
                        color: this.config.colors.powerColor
                    });

                    if (burn) {
                      this.effects.push(burn);

                      this.playback('powerSound', this.sounds.powerSound);
                    }
                }

                // recycle entities
                if (entity.y < 0 - entity.height) {

                    // pick a location
                    let obstacleLane = randomBetween(0, this.state.lanes - 1, true);
                    let location = {
                        x: this.state.laneSize * obstacleLane,
                        y: this.screen.bottom + this.obstacleSize.height
                    };

                    // ignore crowded locations
                    let inValidLocation = this.entities.some((ent) => {
                        return getDistance(ent, location) < this.playerSize.width * 3;
                    });

                    if (!inValidLocation) {

                        // reset entity
                        entity.setXY(location.x, location.y);
                    }

                }
                
            }

            // update and draw effects
            for (let i = 0; i < this.effects.length; i++) {
                let effect = this.effects[i];

                // run effect tick
                effect.tick(this.frame.count);

                // remove in-active effects
                if (!effect.active) {
                    this.effects.splice(i, 1);
                }
                
            }

            // check for game over
            if (this.state.lives < 1) {
                // big explosion
                this.effects.push(
                    new Spark({
                        ctx: this.ctx,
                        n: 500,
                        x: this.player.cx,
                        y: this.player.cy,
                        vx: [-25, 25],
                        vy: [-25, 25],
                        color: this.config.colors.trailColor,
                        burnRate: 0.025
                    })
                );

                this.playback('gameOverSound', this.sounds.gameOverSound);

                // game over
                this.setState({ current: 'over' });
            }

            // add player trail
            this.effects.push(
                new Spark({
                    ctx: this.ctx,
                    n: 2 + this.state.boost,
                    x: this.player.cx,
                    y: this.player.cy,
                    rd: [1, 3],
                    vx: [-1, 1],
                    vy: [-10, -1],
                    color: this.config.colors.trailColor,
                    burnRate: 0.025
                })
            );

            // monster attack
            if (this.monster.attacking) {

                this.state.attackFrames += 1;
                this.monster.move(0, 0, this.frame.scale);
                this.monster.moveTo({ x: this.player.x, y: this.player.y });

                // check for monster smash
                if (collideDistance(this.monster, this.player)) {
                    this.monsterKill();
                    this.throttledPlayback('attackSound', this.sounds.attackSound);

                    let burn = this.throttledBurn({
                        ctx: this.ctx,
                        x: this.player.cx,
                        y: this.player.cy,
                        color: this.config.colors.powerColor
                    });

                    if (burn) {
                      this.effects.push(burn);
                    }
                }

            } else {

                this.monster.move(0, 0, this.frame.scale);
                this.monster.moveTo({ x: this.screen.centerX, y: (this.playerSize.height * 2) * -1 });
            }
            this.monster.draw();

            // player bounce
            let dy = Math.cos(this.frame.count / 5) / 30;

            // move player: open play
            let { left, right } = this.input;
            let opendx = this.gamePlay.lanes ?
            0 : (left ? -1 : 0) + (right ? 1 : 0);

            // move player: lane play
            let lanedx = this.gamePlay.lanes ?
            this.state.playerLane * this.state.laneSize : null;

            // decelerate
            this.state.boost = Math.max(0.75, this.state.boost - 0.050);

            // apply movement
            this.player.move(opendx, dy, this.frame.scale);
            this.player.moveTo({
                x: lanedx,
                y: this.screen.top + (this.player.height * this.state.boost)
            }); 
            this.player.draw();
        }

        // game over
        if (this.state.current === 'over') {
            // game over code
            this.overlay.setBanner(this.config.settings.gameOverText);

            // update and draw effects
            for (let i = 0; i < this.effects.length; i++) {
                let effect = this.effects[i];

                // run effect tick
                effect.tick(this.frame.count);

                // remove in-active effects
                if (!effect.active) {
                    this.effects.splice(i, 1);
                }
                
            }

            // restart game after only stream effect left
            if (this.effects.length < 20) {
                this.overlay.hide('banner');

                window.setScore(this.state.score);
                window.setAppView('setScore');
            }

        }

        // draw the next screen
        if (this.state.current === 'stop') {
            this.cancelFrame();
        } else {
            this.requestFrame(() => this.play());
        }
    }

    shiftRight() {
        // right
        this.setState({
            playerLane: Math.min(this.state.playerLane + 1, this.state.lanes - 1)
        });

        this.playback('turnSound', this.sounds.turnSound);
    }

    shiftLeft() {
        // left
        this.setState({
            playerLane: Math.max(this.state.playerLane - 1, 0)
        });

        this.playback('turnSound', this.sounds.turnSound);
    }

    boost() {
        this.state.boost += 3;
        this.state.score += 1;

        this.playback('boostSound', this.sounds.boostSound);
    }

    // event listeners
    handleClicks(e) {
        if (this.state.current === 'loading') { return; }

        let { target } = e;

        // mute
        if (target.id === 'mute') {
            this.mute();
        }

        // pause
        if (target.id === 'pause') {
            this.pause();
        }

        // button
        if ( target.id === 'button') {

            this.setState({ current: 'play' });
        }
    }

    handleKeyboardInput(type, code) {
        if (type === 'keydown' && this.state.current === 'play') {
            if (code === 'ArrowRight') {
                this.input.right = true;
            }
            if (code === 'ArrowLeft') {
                this.input.left = true;
            }
        }

        if (type === 'keyup' && this.state.current === 'play') {
            if (code === 'ArrowRight') {
                this.input.right = false;
                this.shiftRight();
            }
            if (code === 'ArrowLeft') {
                this.input.left = false;
                this.shiftLeft();
            }

            if (code === 'Space') {
                this.throttledBoost();
            }
        }

        // start game on read
        if (type === 'keydown' && this.state.current === 'ready') {
            this.setState({ current: 'play' });
        }

        // reload on game over
        if (type === 'keydown' && this.state.current === 'over') {
            this.effects.length === 1 && this.load();
        }

    }

    handleTap(type, e) {
        // ignore for first 1 second
        if (this.frame.count < 60) { return; }

        // shift right for right of player taps
        // shift left for left of player taps
        if (type === 'start') {
            let location = canvasInputPosition(this.canvas, e.touches[0]);

            if (location.x > this.screen.centerX) {
                this.input.right = true;
                this.input.left = false;
                this.shiftRight();
            }

            if (location.x < this.screen.centerX) {
                this.input.left = true;
                this.input.right = false;
                this.shiftLeft();
            }
        }

        if (type === 'end') {
            this.input.right = false;
            this.input.left = false;
        }
    }

    // handle swipe
    handleSwipe(type, touch) {
        // get a swipe after 2 touch moves
        onSwipe(type, touch, 2, (swipe) => {

            // left
            if (swipe.direction === 'left') {
                this.input.left = true;
                this.input.right = false;
                this.shiftLeft();
            }

            // right
            if (swipe.direction === 'right') {
                this.input.right = true;
                this.input.left = false;
                this.shiftRight();
            }

            // slide
            if (swipe.direction === 'down') {
                this.throttledBoost();
            }
        });

        if (type === 'end') {
            this.input.right = false;
            this.input.left = false;
        }
    }

    // method:pause pause game
    pause() {
        if (!this.state.current.match(/play|over/)) { return; }

        this.state.paused = !this.state.paused;
        this.overlay.setPause(this.state.paused);

        if (this.state.paused) {
            // pause game loop
            this.cancelFrame(this.frame.count - 1);

            // mute all game sounds
            this.audioCtx.suspend();

            this.overlay.setBanner('Paused');
        } else {
            // resume game loop
            this.requestFrame(() => this.play(), true);

            // resume game sounds if game not muted
            if (!this.state.muted) {
                this.audioCtx.resume();
            }

            this.overlay.hide('banner');
        }
    }

    // method:mute mute game
    mute() {
        let key = this.prefix.concat('muted');
        localStorage.setItem(
            key,
            localStorage.getItem(key) === 'true' ? 'false' : 'true'
        );
        this.state.muted = localStorage.getItem(key) === 'true';

        this.overlay.setMute(this.state.muted);

        if (this.state.muted) {
            // mute all game sounds
            this.audioCtx.suspend();
        } else {
            // unmute all game sounds
            if (!this.state.paused) {
                this.audioCtx.resume();
            }
        }
    }

    // method:playback
    playback(key, audioBuffer, options = {}) {
        if (this.state.muted) { return; }

        // add to playlist
        let id = Math.random().toString(16).slice(2);
        this.playlist.push({
            id: id,
            key: key,
            playback: audioPlayback(audioBuffer, {
                ...{
                    start: 0,
                    end: audioBuffer.duration,
                    context: this.audioCtx
                },
                ...options
            }, () => {
                // remove played sound from playlist
                this.playlist = this.playlist
                    .filter(s => s.id != id);
            })
        });
    }

    // method:stopPlayBack
    stopPlayback(key) {
        this.playlist = this.playlist
        .filter(s => {
            let targetBuffer = s.key === key;
            if (targetBuffer) {
                s.playback.pause();
            }
            return targetBuffer;
        })
    }

    stopPlaylist() {
        this.playlist
        .forEach(s => this.stopPlayback(s.key))
    }

    // reset game
    reset() {
        document.location.reload();
    }

    // update game state
    setState(state) {
        this.state = {
            ...this.state,
            ...{ prev: this.state.current },
            ...state,
        };
    }

    setScreen() {
        this.screen = {
            top: 0,
            bottom: this.canvas.height,
            left: 0,
            right: this.canvas.width,
            centerX: this.canvas.width / 2,
            centerY: this.canvas.height / 2,
            scale: ((this.canvas.width + this.canvas.height) / 2) / 1000,
            scaleWidth: (this.canvas.width / 2) / 1000,
            scaleHeight: (this.canvas.height / 2) / 1000,
            minSize: ((this.canvas.width + this.canvas.height) / 2) / 20,
            maxSize: ((this.canvas.width + this.canvas.height) / 2) / 10 
        };
    }

    // resize screen
    resize() {
        let width = this.canvas.clientWidth;
        let height = this.canvas.clientHeight;

        if (this.canvas.width !== width) {
            this.canvas.width = width;
            return true;
        }

        if (this.canvas.height !== height) {
            this.canvas.height = height;
            return true;
        }

        return false;
    }

    // request new frame
    // wraps requestAnimationFrame.
    // see game/helpers/animationframe.js for more information
    requestFrame(next, resumed) {
        // resize game if needed
        this.resize() && this.setScreen();

        let now = Date.now();
        this.frame = {
            count: requestAnimationFrame(next),
            time: now,
            rate: resumed ? 0 : now - this.frame.time,
            scale: this.screen.scale * this.frame.rate * 0.01
        };
    }

    // cancel frame
    // wraps cancelAnimationFrame.
    // see game/helpers/animationframe.js for more information
    cancelFrame() {
        cancelAnimationFrame(this.frame.count);
    }

    destroy() {
        // stop game loop and stop music
        this.setState({ current: 'stop' });
        this.stopPlaylist();

        // cleanup event listeners
        document.removeEventListener('keydown', this.handleKeyboardInput);
        document.removeEventListener('keyup', this.handleKeyboardInput);
        // document.removeEventListener('touchstart', this.handleTap);
        // document.removeEventListener('touchend', this.handleTap);
        document.removeEventListener('touchstart', this.handleSwipe);
        document.removeEventListener('touchmove', this.handleSwipe);
        document.removeEventListener('touchend', this.handleSwipe);
        this.overlay.root.removeEventListener('click', this.handleClicks);

        // cleanup nodes
        delete this.overlay;
        delete this.canvas;
    }
}

export default Game;