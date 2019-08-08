import { h, Component } from 'preact';
import PropTypes from 'prop-types';
import Koji from 'koji-tools';

class SetScore extends Component {
  static propTypes = {
    score: PropTypes.number,
  };

  state = {
    // email: '',
    name: '',
    isSubmitting: false,
  };

  style = {
    form: {
      color: Koji.config.colors.textColor,
      backgroundColor: Koji.config.colors.primaryColor,
      fontFamily: Koji.config.settings.fontFamily
    },
    input: {
      color: Koji.config.colors.textColor,
      borderColor: Koji.config.colors.textColor,
      backgroundColor: Koji.config.colors.primaryColor,
      fontFamily: Koji.config.settings.fontFamily
    },
    button: {
      color: Koji.config.colors.textColor,
      backgroundColor: Koji.config.colors.backgroundColor,
      fontFamily: Koji.config.settings.fontFamily
    }
  }

  handleSubmit = (e) => {
    e.preventDefault();

    this.setState({ isSubmitting: true });

    const body = {
      name: this.state.name || 'anonymous',
      score: this.props.score,
      // privateAttributes: {
      //    email: this.state.email,
      // },
    };

    fetch(`${Koji.config.serviceMap.backend}/leaderboard/save`, {
      method: 'post',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
      .then((response) => response.json())
      .then((jsonResponse) => {
          console.log(jsonResponse);

          window.setAppView('leaderboard');
      })
      .catch(err => {
          console.log(err);
      });
  }

  render() {
    return (
      <div id={'leaderboard-set-score'} style={this.style.form}>
        <form
          id={'score-form'}
          onSubmit={this.handleSubmit}
        >
          <h2>
            {'Submit to Leaderboard'}
          </h2>

          <div className={'input-wrapper'}>
            <label className={'label'}>
              {'Your Score'}
            </label>
            <input
              disabled
              value={this.props.score}
              style={this.style.input}
            />
          </div>

          <div className={'input-wrapper'}>
            <label className={'label'}>
              {'Your Name'}
            </label>
            <input
              onChange={(event) => {
                this.setState({ name: event.target.value });
              }}
              type={'text'}
              value={this.state.name}
              style={this.style.input}
            />
          </div>

          {/* <div className={'input-wrapper'}>
            <label>{'Your Email Address (Private)'}</label>
            <input
              onChange={(event) => {
                this.setState({ email: event.target.value });
              }}
              type={'email'}
              value={this.state.email}
            />
          </div> */}

          <button
            disabled={this.state.isSubmitting}
            onClick={this.handleSubmit}
            type={'submit'}
            style={this.style.button}
          >
            {'Submit'}
          </button>
          </form>
      </div>
    )
  }
}

export default SetScore;
