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
const attemptsLabel = document.getElementById('attempts');

// globals
var lock = false;
var currentId = "-1";
var reqLoc = new URL(window.location + "attempt"); // endpoint to process an attempt
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
	for (var i = 0; i < gameConfig['count']; i++) {
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

async function submitNums() {
	// lock our data while we're submitting
	lock = true;
	var attempt = getCurrentNumbers();

	// we have backend checks for this, but let's not allow them to submit incomplete guesses
	if (attempt == null) {
		addToHistory("ERROR: Invalid attempt! Check your input.");
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

		if (data['status'] == 'OK') {
			resultString += "INPUT: " + data['attemptedNumber'] + " | RESULT: ";
			switch (data['matches']) {
				case 0:
					resultString += "NONE";
					break ;
				case gameConfig['count']:
					resultString += "SUCCESS";
					break ;
				default:
					resultString += "PARTIAL (" + data['matches'] + ")";
					break ;
			}
			attemptsLabel.innerHTML = "" + data['tries'] + " attempts remain.";
		}
		else {
			resultString += "FAIL";
			attemptsLabel.innerHTML = "10 attempts remain.";
		}
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
	else
		console.log("loading, please wait...");
});

// listener for config changes
saveSettingsButton.addEventListener('click', function(e) {
	// prevent reload on button press
	e.preventDefault();

	// if they have valid inputs for these fields, update their config entry
	if (isNaN(parseInt(countForm.value)) != true)
		gameConfig['count'] = parseInt(countForm.value);
	if (isNaN(parseInt(minValueForm.value)) != true)
		gameConfig['minValue'] = parseInt(minValueForm.value);
	if (isNaN(parseInt(maxValueForm.value)) != true)
		gameConfig['maxValue'] = parseInt(maxValueForm.value);
	reloadGame();
});
