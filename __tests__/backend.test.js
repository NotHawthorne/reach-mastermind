const app = require("../app");
const db = require("../db");
const request = require("supertest");
const session = require('supertest-session');
const crypto = require("crypto");
var registeredUsers = 0;
var testSession = null;

beforeAll(async () => {
	await db.pool.query("CREATE TABLE test_accounts(id SERIAL PRIMARY KEY, username VARCHAR(45) NOT NULL, password VARCHAR(128) NOT NULL, score INT);");
});

beforeEach(async () => {
	await db.pool.query("INSERT INTO test_accounts(username, password, score) VALUES('" + ("test" + registeredUsers) + "', '" + crypto.createHash("sha256").update("password" + registeredUsers).digest("hex") + "', 0);");
});

beforeEach(function() {
	testSession = session(app);
	registeredUsers += 1;
});

afterAll(async () => {
	await db.pool.query("DROP TABLE test_accounts;");
});

it('should sign in', function(done) {
	testSession.post('/auth')
		.send({'username': 'test0', 'password': 'password0'})
		.expect(200)
		.end(done);
});

/*
describe("POST /auth", () => {
	test("It logs in as a valid user", async () => {
		var response = await request(app.app).post("/students").send({
			'username': 'test0',
			'password': 'password0',
		});
		await console.log(response.);
		expect(1).toBe(1);
	});
});
*/
