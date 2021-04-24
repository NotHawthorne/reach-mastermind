const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const axios = require('axios');
const { v4:uuid } = require('uuid');
const _ = require('lodash');

// array of objects that contain info on the current ongoing games
var currentGames = {};

// serve from public folder
app.use(express.static('public'));

app.get('/', (req, res) => {
	res.render(index);
});

async function attempt(id, input, config) {
	// start a new game if they haven't started one, they supplied an invalid id, or their config changed
	if (id == "-1" || currentGames.hasOwnProperty(id) == false || _.isEqual(config, currentGames[id]['config']) != true) {
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

		var retObj = {
			'id': id,
			'matches': matches,
			'tries': game['tries'],
			'status': 'OK',
			'attemptedNumber': input,
		};

		// if we're out of tries, or we have guessed correctly, we are done with this game
		if (matches == 4 || game['tries'] <= 0)
			delete currentGames[id];
		return game['tries'] > 0 ? retObj : null;
	}
}

app.get('/attempt', async (req, res) => {
	var id = req.query.id;
	var input = req.query.input;
	var ret = await attempt(id, input, {'count': req.query.count, 'minValue': req.query.minValue, 'maxValue': req.query.maxValue});
	if (ret == null) {
		res.send({'status': 'KO', 'attemptedNumber': input});
		console.log("GAME OVER FOR GAME #"+id);
	}
	else {
		console.log(ret);
		res.send(ret);
	}
});

app.listen(port, () => {
	console.log("Listening...");
});
