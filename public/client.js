// buttons
const submitButton = document.getElementById('submitButton');
const settingsButton = document.getElementById('settingsButton');
const saveSettingsButton = document.getElementById('saveSettingsButton');

// input forms
const numbersForm = document.getElementById('numbers');
const countForm = document.getElementById('count');
const minValueForm = document.getElementById('minValue');
const maxValueForm = document.getElementById('maxValue');

// misc elements
const historyDiv = document.getElementById('historyDiv');
const numbersGroup = document.getElementById('numbersFormGroup');
const resultModal = document.getElementById('resultModal');

//labels
const leaderScore = document.getElementById('leaderScore');
const leaderTotal = document.getElementById('leaderTotal');
const resultText = document.getElementById('resultText');
const attemptsLabel = document.getElementById('attempts');
const leaderScoreNames = document.getElementById('leaderScoreNames');
const leaderTotalNames = document.getElementById('leaderTotalNames');

// globals
var lock = false;
var currentId = "-1";
var reqLoc = new URL(window.location.href.split('#')[0] + "attempt"); // endpoint to process an attempt
var leaderLoc = new URL(window.location.href.split('#')[0] + "leaderboard");
var maxHistory = 50;

var gameConfig = {
	'count': 4,
	'minValue': 0,
	'maxValue': 7,
};

function getCurrentNumbers() {
	var forms = numbersGroup.getElementsByTagName('input');
	var ret = [];
	console.log(forms);
	for (x in forms) {
		if (isNaN(parseInt(forms[x].value)) != true)
			ret.push(parseInt(forms[x].value));
		else if (x < gameConfig['count'])
			return null;
	}
	return ret;
}

function reloadGame() {
	// clear the list
	while (numbersGroup.firstChild)
		numbersGroup.removeChild(numbersGroup.firstChild);
	// populate based on config
	for (var i = 0; i < gameConfig['count'] && i < 50; i++) {
		numbersGroup.appendChild(document.createElement("br"));
		var input = document.createElement("input");
		input.setAttribute("type", "text");
		input.setAttribute("id", "number" + i);
		input.setAttribute("class", "form-control");
		input.setAttribute("placeholder", "0");
		numbersGroup.appendChild(input);
	}
	attemptsLabel.innerHTML = "10 attempts remain.";
}

reloadGame();

function addToHistory(str) {
	// create history entry
	var li = document.createElement('li');
	var ul = historyDiv.getElementsByTagName('ul')[0];
	li.appendChild(document.createTextNode(str));

	// pop last element if we're over 20
	if (ul.getElementsByTagName("li").length > maxHistory)
		ul.removeChild(ul.lastChild);

	// add to history at top
	if (ul.firstChild) 
		ul.insertBefore(li, ul.firstChild);
	else
		ul.appendChild(li);
}

function alertModal(message) {
	alertText.innerHTML = message;
	document.getElementById('toggleAlert').click(); // i know im sorry
}

function validateConfig(conf) {
	var ret = true;
	if (conf['minValue'] < -1000000000 || conf['minValue'] > 1000000000 || conf['minValue'] >= conf['maxValue']) {
		minValueForm.className = minValueForm.className + " error";
		ret = false;
	}
	if (conf['maxValue'] < -1000000000 || conf['maxValue'] > 1000000000) {
		maxValueForm.className = maxValueForm.className + " error";
		ret = false;
	}
	if (conf['count'] > 50) {
		console.log(conf['count']);
		countForm.className = countForm.className + " error";
		ret = false;
	}
	if (ret == false) {
		//console.log("hiding settings");
		document.getElementById('showSettings').click();
	}
	
	return ret;
}

function finishGame(result) {
	resultText.innerHTML = result == true ? "You've won!" : "Game over. Try again!";
	document.getElementById('toggleResults').click();
}

// submits the chosen numbers to the server
async function submitNums() {
	// lock our data while we're submitting
	lock = true;
	var attempt = getCurrentNumbers();

	// we have backend checks for this, but let's not allow them to submit incomplete guesses
	if (attempt == null) {
		alertModal("Invalid input. Please make sure you've filled out all the numbers.");
		lock = false;
		return ;
	}

	// validate their config -- we should do this in the modal before close
	if (validateConfig(gameConfig) == false) {
		alertModal("Your game settings are invalid. Please review them and make sure that their values are appropriate.");
		lock = false;
		return ;
	}

	var params = new URLSearchParams(attempt.map(n=>['input',n]));
	params.append('id', currentId);
	params.append('count', gameConfig.count);
	params.append('minValue', gameConfig.minValue);
	params.append('maxValue', gameConfig.maxValue);
	reqLoc.search = params;
	await fetch(reqLoc).then(async function (response) {
		var data = await response.json();
		console.log(data);

		// if we are on a different game, keep track of that
		if (currentId != data.id) {
			currentId = data.id;
			addToHistory("NEW GAME! Guess " + gameConfig['count'] + " numbers!");
		}
		var resultString = "";

		switch (data['status']) {
			case 'OK':
				resultString += "INPUT: " + data['attemptedNumber'] + " | RESULT: ";
				switch (data['matches']) {
					case 0:
						resultString += "NONE";
						break ;
					case gameConfig['count']:
						resultString += "SUCCESS";
						finishGame(true);
						break ;
					default:
						resultString += "PARTIAL (" + data['matches'] + ")";
						break ;
				}
				attemptsLabel.innerHTML = "" + data['tries'] + " attempts remain.";
				break ;
			case 'KO':
				resultString += "FAIL";
				attemptsLabel.innerHTML = "10 attempts remain.";
				finishGame(false);
				break ;
			case '?':
				alertModal("Invalid input! Please make sure you've filled out all the numbers.");
				break ;
			default:
				break ;

		}
		if (resultString != "")
			addToHistory(resultString);
		// ok we're done now, carry on
		lock = false;
	});
}

// listener for submissions
submitButton.addEventListener('click', function(e) {
	// prevent reload on button press
	e.preventDefault();

	// don't submit another request if we're still waiting on results
	if (lock == false)
		submitNums();
});

// listener for config changes
saveSettingsButton.addEventListener('click', function(e) {
	// prevent reload on button press
	e.preventDefault();

	newConf = {};

	// if they have valid inputs for these fields, update their config entry
	newConf['maxValue'] = isNaN(parseInt(maxValueForm.value)) != true ? parseInt(maxValueForm.value) : gameConfig['maxValue'];
	newConf['minValue'] = isNaN(parseInt(minValueForm.value)) != true ? parseInt(minValueForm.value) : gameConfig['minValue'];
	newConf['count'] = isNaN(parseInt(countForm.value)) != true ? parseInt(countForm.value) : gameConfig['count'];
	if (validateConfig(newConf) == true) {
		gameConfig = newConf;
		reloadGame();
	} else {
		alertModal("Settings invalid! Please double-check the indicated fields.");
	}
});

document.getElementById('alertClose').addEventListener('click', function(e) {
	if (document.getElementById('alertText').innerHTML == "Settings invalid! Please double-check the indicated fields.") {
		document.getElementById('showSettings').click();
	}
});

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

document.getElementById('debugClick').addEventListener('click', function(e) {
	console.log(user);
});
