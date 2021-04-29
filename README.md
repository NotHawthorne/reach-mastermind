![Test](/public/logo.png)
<br>
[Documentation](https://nothawthorne.github.io/reach-mastermind-docs)
## What is Mastermind?
Mastermind is a simple game. When a new round starts, a set of numbers are generated. From that set of numbers, an amount are picked (by default: 4), and the user must guess which numbers Mastermind has picked within 10 guesses. After each submission, Mastermind will respond with how many numbers were picked that matched. Afterwards, the game is scored, and if the user is logged in, it is also saved to the database.
## How To Install
This project requires [npm](https://github.com/npm/cli) before setup. Proceed after installing npm.
- `git clone https://github.com/NotHawthorne/reach-mastermind mastermind`
- `cd mastermind`
- `npm install`
- `npm start`
## The Database
I've left out the connection string for the MySQL database from this repository. Please contact me if you didn't get the MySQL connection string along with a link to this repository.
