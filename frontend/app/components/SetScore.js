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

	componentDidMount() {
		//Activated with a delay so it doesn't lose focus immediately after click
		setTimeout(function(){
			this.nameInput.focus();
		}.bind(this), 100);
		
	}

	handleClose = () => {
		window.setAppView("game");
	}

	handleSubmit = (e) => {
		e.preventDefault();

		if (this.state.name != "") {
			this.setState({ isSubmitting: true });

			const body = {
				name: this.state.name,
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
	}

	render() {
		return (
			<div style={{ height: '100vh', width: '100vw', backgroundColor: Koji.config.leaderboard.backgroundColor, fontFamily: Koji.config.settings.fontFamily }}>
				<div className="title"
					style={{ color: Koji.config.leaderboard.setScoreTitleColor }}>
					{Koji.config.leaderboard.setScoreTitle}
				</div>

				<div id={'leaderboard-set-score'} style={{ backgroundColor: Koji.config.leaderboard.setScoreBackgroundColor, borderColor: Koji.config.leaderboard.setScoreBorderColor }}>
					<form
						id={'score-form'}
						onSubmit={this.handleSubmit}
					>
						<div className={'input-wrapper'}>
							<label className={'label'} style={{ color: Koji.config.leaderboard.setScoreLabelColor }}>
								{Koji.config.leaderboard.setScoreLabelScore}
							</label>
							<input
								disabled
								value={this.props.score}
								style={{ color: Koji.config.leaderboard.setScoreInputTextColor }}
							/>
						</div>

						<div className={'input-wrapper'}>
							<label className={'label'} style={{ color: Koji.config.leaderboard.setScoreLabelColor }}>
								{Koji.config.leaderboard.setScoreLabelName}
							</label>
							<input
								onChange={(event) => {
									this.setState({ name: event.target.value });
								}}
								type={'text'}
								value={this.state.name}
								style={{ color: Koji.config.leaderboard.setScoreInputTextColor }}
								ref={(input) => { this.nameInput = input; }}
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
							style={{ backgroundColor: Koji.config.leaderboard.setScoreSubmitButtonColor, color: Koji.config.leaderboard.setScoreSubmitButtonTextColor }}
						>
							{Koji.config.leaderboard.setScoreSubmitButtonText}
						</button>
					</form>

					<button className="dismiss-button"
						onClick={this.handleClose}
						style={{ backgroundColor: Koji.config.leaderboard.setScoreCancelButtonColor, color: Koji.config.leaderboard.setScoreCancelButtonTextColor}}>
						{Koji.config.leaderboard.setScoreCancelButtonText}

					</button>


				</div>
			</div>
		)
	}
}

export default SetScore;