const express 		= require('express');
const axios 		= require('axios');
const { v4:uuid } 	= require('uuid');
const mysql		= require('mysql2/promise');
const crypto		= require('crypto');
const session		= require('express-session');
const parser		= require('body-parser');
const swig		= require('swig');

const app 		= express();
const port 		= process.env.PORT || 3000;
const engine		= new swig.Swig();

// a free mysql database
// normally would store the db pass in .env file
// maybe do that before submission
const pool = mysql.createPool({
	connectionLimit	: 10,
	host		: '34.94.44.185',
	user		: 'app',
	database	: 'mastermind',
	password	: 'reachrules',
	port		: 3306,
});

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

// serve from public folder
//app.use(express.static('public'));

app.listen(port, () => { console.log("Listening..."); });
app.get('/', (request, response) => {
	response.render("index", {user: request.session.username});
});

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
			if (getUser(request.session.username) != null) {
				saveGame(request.session.username, ret.score);
			}
		}
		console.log(ret);
		response.send(ret);
	}
});

app.get('/leaderboard', async function(request, response) {
	
});

app.get('/profile', async function(request, response) {
	
});

app.post('/auth', async function(request, response) {
	var username = request.body.username;
	var plainpass = request.body.password;

	// encrypt paintext
	var password = crypto.createHash("sha256").update(plainpass).digest("hex");

	// if the user doesn't exist, create it
	var user = getUser(username);
	if (JSON.stringify(user) == JSON.stringify({ })) {
		register(username, password, function() { return ; });
		user = getUser(username);
	}
	var loginRes = await attemptLogin(username, password);
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

async function saveGame(username, score) {
	await pool.query(`UPDATE accounts SET wins = wins + 1, total_score = total_score + ${score} WHERE username='${username}';`);
}

function register(username, password, callback) {
	// encrypt password
	var hashPass = crypto.createHash("sha256").update(password).digest("hex");
	pool.getConnection(function (err, connection) {
		connection.query(`INSERT IGNORE INTO accounts(username, password) VALUES ('${username}','${hashPass}')`, function (err, rows) {
			if (err) throw err;
			connection.release();
		});
	});
}

// returns either an empty object or user information
async function getUser(username) {
	var retObj = { }
	pool.getConnection(async function (err, connection) {
		var result = await connection.query(`SELECT * FROM accounts WHERE username='${username}';`);
		for (var i in result._results) {
			console.log(result);
			console.log(result[i]);
			retObj['id'] = result[i][0];
			retObj['username'] = result[i][1];
		}
		connection.release();
	});
	return retObj;
}

// login business logic
async function attemptLogin(username, password) {
	const result = await pool.query(`SELECT * FROM accounts WHERE username='${username}';`);
	console.log(password + " | " + result[0][0].password);
	if (password == result[0][0].password)
		return true;
	return false;
}

function getHistory(username, callback) {
	var desUser = getUser(username);
	var ret = [];
	if (JSON.stringify(desUser) == JSON.stringify({ }))
		return null;
	connection.connect();
	connection.query(`SELECT * FROM history WHERE user_id='${desUser['id']}' ORDER BY score DESC;`, function(error, results, fields) {
		if (error)
			throw error;
		for (var i = 0; i < Object.keys(results).length; i++) {
			ret.push({'score': results[i][1], 'date': results[i][2]});
		}
	});
	connection.end();
	return ret;
}

async function attempt(id, input, config) {
	// start a new game if they haven't started one, they supplied an invalid id, or their config changed
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
	console.log("[Mastermind] Processing attempt for game " + id);
	console.log(input);
	game = currentGames[id];
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
			'id': id,
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
