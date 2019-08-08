import { h, Component } from 'preact';
import Koji from 'koji-tools';

class Leaderboard extends Component {
  state = {
    scores: [],
    dataIsLoaded: false,
    error: false,
  };

  style = {
    color: Koji.config.colors.textColor,
    backgroundColor: Koji.config.colors.primaryColor,
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
            {'Loading...'}
          </div>
        </div>
      );
    }

    return (
      <div id={'leaderboard'} style={this.style}>
        <div className={'leaderboard-container'}>
          <div class={'leaderboard-title'}>
          <div class={'leaderboard-title-text'}>{'Top scores'}</div>
            <div
              class={'leaderboard-close-button'}
              onClick={() => { window.setAppView('game'); }}
            >
              {'Close'}
            </div>
          </div>
          <div className={'leaderboard-contents'}>
            {
              this.state.scores
              .filter(score => Number.isInteger(score.score))
              .map((score, index) => (
                <div
                  className={'score-row'}
                  key={index}
                >
                  <div className={'name'}>
                    {`${index + 1}. ${score.name}`}
                  </div>
                  <div className={'score'}>
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