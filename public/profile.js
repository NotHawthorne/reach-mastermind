//labels
const leaderScore = document.getElementById('leaderScore');
const leaderTotal = document.getElementById('leaderTotal');
const leaderScoreNames = document.getElementById('leaderScoreNames');
const leaderTotalNames = document.getElementById('leaderTotalNames');

var leaderLoc = new URL(window.location.protocol + "//" + window.location.host + "/" + "leaderboard");

function alertModal(message) {
	alertText.innerHTML = message;
	document.getElementById('toggleAlert').click(); // i know im sorry
}

document.getElementById('leaderboardLink').addEventListener('click', async function(e) {
	console.log("testing");
	while (leaderScore.firstChild) {
		leaderScore.removeChild(leaderScore.firstChild);
		leaderScoreNames.removeChild(leaderScoreNames.firstChild);
	}
	while (leaderTotal.firstChild) {
		leaderTotal.removeChild(leaderTotal.firstChild);
		leaderTotalNames.removeChild(leaderTotalNames.firstChild);
	}
	var response = await fetch(leaderLoc);
	console.log(response);
	console.log("testing2");
	await fetch(leaderLoc).then(async function (response) {
		var data = await response.json();
		console.log(data);
		for (x in data['per_game']) {
			var input = document.createElement("li");
			var score = document.createElement("li");
			input.innerHTML = data['per_game'][x].user;
			score.innerHTML = data['per_game'][x].score;
			leaderScore.appendChild(score);
			leaderScoreNames.appendChild(input);
		}
		for (x in data['total']) {
			var input = document.createElement("li");
			var score = document.createElement("li");
			input.innerHTML = data['total'][x].user;
			score.innerHTML = data['total'][x].score;
			leaderTotalNames.appendChild(input);
			leaderTotal.appendChild(score);
		}
		document.getElementById('toggleLeaderboard').click();
	});
});
