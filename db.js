/**
 * @module Database
 */

const mysql		= require('mysql2/promise');
const crypto		= require('crypto');

// gcp update before submission
const pool = mysql.createPool({
	connectionLimit	: 10,
	host		: '34.94.44.185',
	user		: 'app',
	database	: 'mastermind',
	password	: 'reachrules',
	port		: 3306,
});

/**
 * Function to save a game to the database.
 *
 * @param {string} username - The user who completed the game.
 * @param {int} score - The game's score.
 */

async function saveGame(username, score) {
	await pool.query(`UPDATE accounts SET wins = wins + 1, total_score = total_score + ${score} WHERE username='${username}';`);
	await pool.query(`INSERT INTO history(user_id, score, date) VALUES ('${username}', ${score}, now());`);
}

/**
 * Function to register a new user.
 *
 * @param {string} username - Name of user to be registered.
 * @param {string} password - Password of user to be registered.
 */

async function register(username, password) {
	await pool.query(`INSERT INTO accounts(username, password) VALUES('${username}', '${password}');`);
}

/**
 * Function to return either an empty object or valid user object.
 *
 * @param {string} username - Name of user we are searching for.
 * @returns {object}
 */

async function getUser(username) {
	var retObj = { }
	var results = await pool.query(`SELECT * FROM accounts WHERE username='${username}';`);
	for (var i in results[0]) {
		retObj['id'] = results[0][i].id;
		retObj['username'] = results[0][i].username;
	}
	if (JSON.stringify(retObj) == JSON.stringify({ })) {
		console.log("Failed login!");
	}
	return retObj;
}

/**
 * Function to check if provided user information is valid.
 *
 * @param {string} username - Name of user we are trying to log in as.
 * @param {string} password - Password of user we are trying to log in as.
 * @returns {boolean}
 */

async function attemptLogin(username, password) {
	const result = await pool.query(`SELECT * FROM accounts WHERE username='${username}';`);
	console.log(password + " | " + result[0][0].password);
	if (password == result[0][0].password)
		return true;
	return false;
}

/**
 * Function to query the database for the top games and users.
 *
 * @returns {object[]}
 */

async function getLeaderboards() {
	var his_res = await pool.query(`SELECT * FROM history ORDER BY score DESC LIMIT 10;`);
	var acc_res = await pool.query(`SELECT * FROM accounts ORDER BY total_score DESC LIMIT 10;`);
	var ret = {
		'per_game': [],
		'total': [],
	};
	for (x in his_res[0]) {
		console.log("TEST");
		console.log(x);
		ret['per_game'][x] = {
			'user': his_res[0][x].user_id,
			'score': his_res[0][x].score,
		}
	}
	for (x in acc_res[0]) {
		ret['total'][x] = {
			'user': acc_res[0][x].username,
			'score': acc_res[0][x].total_score,
		}
	}
	console.log(ret);
	return ret;
}

/**
 * Function to query the database for a user's history.
 *
 * @param {string} username - Name of user we are requesting the history of.
 * @returns {object[]}
 */

async function getHistory(username) {
	var desUser = await getUser(username);
	var ret = [];
	if (JSON.stringify(desUser) == JSON.stringify({ }))
		return null;
	var results = await pool.query(`SELECT * FROM history WHERE user_id='${desUser['username']}' ORDER BY date DESC;`);
	console.log(results[0]);
	for (var i in results[0])
		ret.push({'score': results[0][i].score, 'date': results[0][i].date});
	return ret;
}

module.exports = {
	pool,
	getHistory,
	getLeaderboards,
	attemptLogin,
	getUser,
	register,
	saveGame
}
