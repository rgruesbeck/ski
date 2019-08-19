import { h, Component } from 'preact';
import PropTypes from 'prop-types';

import Game from '../../game/main';
import Overlay from '../../game/overlay.js';

class GameContainer extends Component {
  componentDidMount() {

    const gameScreen = document.getElementById('gameScreen');
    const gameOverlay = document.getElementById('gameOverlay');
    const topbar = document.getElementById('topBar');

    const overlay = new Overlay(gameOverlay)
    this.game = new Game(gameScreen, overlay, topbar, Koji.config);

    this.game.load();
  }

  componentWillUnmount() {

    this.game.destroy();
  }

  render() {
    return (
      <div id={'game-container'} >
        <div id={'app'}>
          <div id={'topBar'}></div>
          <canvas id={'gameScreen'} style={{
            backgroundColor: 'rgba(0, 0, 0, 0)',
            width: '100vw',
            height: '100vh'
          }}></canvas>
          <div id={'gameOverlay'}>
            <div className={'container'}>
              <div id={'loading'} class={'la-ball-clip-rotate'}>
                <span id={'loading-progress'}>0%</span>
                <div></div>
              </div>
              <div className={'center'}>
                <div id={'banner'}>Game Title</div>
                <div id={'button'}>Start</div>
                <div id={'instructions'}></div>
              </div>
              <div id={'score'}>score</div>
              <div id={'lives'}>lives</div>
              <i id={'mute'} className={'material-icons'}>volume_up</i>
              <i id={'pause'} className={'material-icons'}>pause</i>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default GameContainer;