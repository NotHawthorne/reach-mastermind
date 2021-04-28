/**
 * @module Backend
 */

const express 		= require('express');
const axios 		= require('axios');
const { v4:uuid } 	= require('uuid');
const mysql		= require('mysql2/promise');
const crypto		= require('crypto');
const session		= require('express-session');
const parser		= require('body-parser');
const swig		= require('swig');
const db		= require('./db');

const app 		= express();
const port 		= process.env.PORT || 3000;
const engine		= new swig.Swig();

const usernameRegex = new RegExp("^[a-zA-Z0-9_-]{1,45}$");


// array of objects that contain info on the current ongoing games
var currentGames = {};

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true,
}));
app.use(parser.urlencoded({extended: true}));
app.use(parser.json());
app.engine('html', swig.renderFile)
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

app.listen(port, () => { console.log("Listening..."); });

/**
 * Index endpoint.
 *
 * @function
 * @name get/
 */

app.get('/', (request, response) => {
	response.render("index", {user: request.session.username});
});

/**
 * Logout endpoint.
 *
 * @function
 * @name get/logout
 */

app.get('/logout', (request, response) => {
	request.session.username = null;
	request.session.loggedin = false;
	response.redirect("/");
});

/**
 * Submission endpoint.
 *
 * @function
 * @name post/attempt
 * @param {string} id - ID of user's game
 * @param {number[]} input - Numbers guessed
 * @param {number} count - (Config) Number of numbers to generate/were generated.
 * @param {number} minValue - (Config) Minimum value of generated numbers.
 * @param {number} maxValue - (Config) Maximum value of generated numbers.
 */

app.get('/attempt', async function(request, response) {
	var id = request.query.id;
	var input = request.query.input;
	var ret = await attempt(id, input, {'count': request.query.count, 'minValue': request.query.minValue, 'maxValue': request.query.maxValue});
	if (ret == null) {
		response.send({'status': 'KO', 'attemptedNumber': input});
		console.log("GAME OVER FOR GAME #"+id);
	}
	else {
		if (ret.matches == request.query.count) {
			console.log(request.session.username + " won!");
			if (db.getUser(request.session.username) != null) {
				db.saveGame(request.session.username, ret.score);
			}
		}
		console.log(ret);
		response.send(ret);
	}
});

/**
 * Leaderboard endpoint.
 *
 * @function
 * @name get/leaderboard
 */

app.get('/leaderboard', async function(request, response) {
	var ret = await db.getLeaderboards();
	response.send(ret);
});

/**
 * Profile endpoint.
 *
 * @function
 * @name get/profile
 */

app.get('/profile', async function(request, response) {
	console.log(request.session.username);
	if (request.session.username == null || request.session.username == "") {
		console.log("problem");
		response.redirect("/");
	}
	else {
		var his = await db.getHistory(request.session.username);
		console.log(his);
		response.render("profile", {user: request.session.username, history: his});
	}
});

/**
 * Auth endpoint.
 *
 * @function
 * @name post/auth
 * @param {string} username - Name of user to be logged in.
 * @param {string} password - Password of user to be logged in.
 */

app.post('/auth', async function(request, response) {
	var username = request.body.username;
	var plainpass = request.body.password;

	if (usernameRegex.test(username) == false) {
		response.send({'status': 'MALFORMED_LOGIN'});
		return ;
	}
	// encrypt paintext
	var password = crypto.createHash("sha256").update(plainpass).digest("hex");

	// if the user doesn't exist, create it
	var user = await db.getUser(username);
	if (JSON.stringify(user) == JSON.stringify({ })) {
		await db.register(username, password, function() { return ; });
		user = db.getUser(username);
	}
	var loginRes = await db.attemptLogin(username, password);
	if (loginRes == true) {
		// successful login, set session variables
		request.session.loggedin = true;
		request.session.username = username;
		response.redirect('/');
	}
	else {
		response.send({'status': 'INVALID_LOGIN'});
	}
});

app.use(express.static('public'));

/**
 * Function to either return an existing game or create a new one based on given id and config.
 *
 * @function
 * @name validateOrCreateGame
 * @param {number} id - id of game being attempted
 * @param {object} config - json object of game generation config
 */

async function validateOrCreateGame(id, config) {
	if (id == "-1" || currentGames.hasOwnProperty(id) == false || JSON.stringify(config) != JSON.stringify(currentGames[id]['config'])) {
		await axios({'method':'GET','url':'https://www.random.org/integers/?num=' + config.count + '&format=plain&min=' + config.minValue + '&max=' + config.maxValue + '&col=1&base=10&rnd=new'})
		.then(await async function (response) {
			var data = response.data.split('\n');
			var nums = [];
			var nextId = uuid().toString();
			for (elem in data) {
				if (isNaN(parseInt(data[elem])) != true)
					nums.push(parseInt(data[elem]));
			}

			// create game session
			currentGames[nextId] = {
				'id': nextId,
				'nums': nums,
				'tries': 10,
				'config': JSON.parse(JSON.stringify(config)),
				'score': 0,
			}

			// set the id to a valid one, so we can process the input
			id = nextId;

			console.log("[Mastermind] Creating new game of id " + id + " with nums " + nums);
		});
	}
	console.log(id);
	console.log(currentGames[id].id);
	return currentGames[id];
}

/**
 * Function to submit the chosen numbers.
 *
 * @function
 * @name attempt
 * @param {number} id - id of game being attempted
 * @param {number[]} input - numbers to be submitted
 * @param {object} config - json object of game generation config
 */

async function attempt(id, input, config) {
	console.log("[Mastermind] Processing attempt for game " + id);
	var game = await validateOrCreateGame(id, config);
	if (input === undefined || input.length > game['config']['count'] || input.length <= 0) {
		console.log("[Mastermind] ERROR: Invalid input supplied");
		return {'status': '?', 'id': id}
	}
	else {
		// compare numbers to correct answers
		var matches = 0;
		for (elem in input) {
			if (input[elem] == game['nums'][elem])
				matches++;
		}
		game['tries'] -= 1;
		game['score'] += matches * (game['config']['count'] + (game['config']['maxValue'] - game['config']['minValue']));

		var retObj = {
			'id': game['id'],
			'matches': matches,
			'tries': game['tries'],
			'status': 'OK',
			'attemptedNumber': input,
			'score': game['score'],
		};

		// if we're out of tries, or we have guessed correctly, we are done with this game
		if (matches == game['config']['count'] || game['tries'] <= 0)
			delete currentGames[id];
		return game['tries'] > 0 || game['matches'] == game['config']['count'] ? retObj : null;
	}
}

module.exports = {
	app,
	attempt
}
