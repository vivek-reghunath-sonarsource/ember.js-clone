const rootDiv = document.getElementById('root');
const hash = decodeURIComponent(location.hash.substr(1));
rootDiv.innerHTML = hash;

var mysql = require('mysql');

var connection = mysql.createConnection(
{
  host:'localhost',
  user: "admin",
  database: "project",
  password: "mypassword", // sensitive
  multipleStatements: true
});

connection.connect();

var myarray = [80, 3, 9, 34, 23, 5, 1];

myarray.sort();
console.log(myarray); // outputs: [1, 23, 3, 34, 5, 80, 9]

//-- New --

if (!"prop" in myObj) {  // Noncompliant;  "in" operator is checking property "false"
  doTheThing();  // this block will be never executed
}

if (!foo instanceof MyClass) {  // Noncompliant; "!foo" returns a boolean, which is not an instance of anything
  doTheOtherThing();  // this block is never executed
}

function say(a, b) {
  print(a + " " + b);
}

say("hello", "world", "!"); // Noncompliant; last argument is not used

x=y;