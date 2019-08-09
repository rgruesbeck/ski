import { h, Component } from 'preact';
import Koji from 'koji-tools';

class Leaderboard extends Component {
  state = {
    scores: [],
    dataIsLoaded: false,
    error: false,
  };

  style = {
    backgroundColor: Koji.config.leaderboard.backgroundColor,
    color: Koji.config.leaderboard.leaderboardTitleColor,
    fontFamily: Koji.config.settings.fontFamily
  }

  componentDidMount() {
    fetch(`${Koji.config.serviceMap.backend}/leaderboard`)
      .then((response) => response.json())
      .then(({ scores }) => {
        this.setState({ dataIsLoaded: true, scores });
      })
      .catch(err => {
        console.log('Fetch Error: ', err);
        this.setState({ error: true });
      });
  }

  render() {
    if (this.state.error) {
      return (
        <div id={'leaderboard'} style={this.style}>
          <div className={'leaderboard-loading'}>
            <div>{'Error!'}</div>
            <button onClick={() => window.setAppView('game')}>
              {'Back to Game'}
            </button>
          </div>
        </div>
      );
    }

    if (!this.state.dataIsLoaded) {
      return (
        <div id={'leaderboard'} style={this.style}>
          <div className={'leaderboard-loading'}>
            <div style="display: flex; margin-top: 20vh; justify-content: center; text-align: center; animation-name: logo; animation-duration: 2s; animation-iteration-count: infinite; animation-timing-function: ease-out;">
            <div class="lds-ring"><div></div><div></div><div></div><div></div></div>
	        </div>
          </div>
        </div>
      );
    }

    return (
      <div id={'leaderboard'} style={this.style}>
        <div className={'leaderboard-container'}>
          <div class={'leaderboard-title'}>
          <div class={'leaderboard-title-text'} style={{color: Koji.config.leaderboard.leaderboardTitleColor}}>{Koji.config.leaderboard.leaderboardTitle}</div>
            <div
              class={'leaderboard-close-button'}
              onClick={() => { window.setAppView('game'); }}
              style={{color: Koji.config.leaderboard.leaderboardCloseColor}}
            >
              {Koji.config.leaderboard.leaderboardCloseText}
            </div>
          </div>
          <div className={'leaderboard-contents'}>
            {
              this.state.scores
              .filter(score => !isNaN(score.score))
              .map((score, index) => (
                <div
                  className={'score-row'}
                  key={index}
                  style={{backgroundColor: Koji.config.leaderboard.leaderboardEntryBackgroundColor}}
                >
                  <div className={'name'} style={{color: Koji.config.leaderboard.leaderboardNameColor}}>
                    {`${index + 1}. ${score.name}`}
                  </div>
                  <div className={'score'} style={{color: Koji.config.leaderboard.leaderboardScoreColor}}>
                    {score.score}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    );
  }
}

export default Leaderboard;