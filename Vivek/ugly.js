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
var anotherArray =[10,11];

myarray.sort();
console.log(myarray); // outputs: [1, 23, 3, 34, 5, 80, 9]

//-- New --

if (!("prop" in myObj)) {  // Noncompliant;  "in" operator is checking property "false"
  doTheThing();  // this block will be never executed
}

if (!foo instanceof MyClass) {  // Noncompliant; "!foo" returns a boolean, which is not an instance of anything
  doTheOtherThing();  // this block is never executed
}

function say(a, b) {
  print(a + " " + b);
}

say("hello", "world", "!"); // Noncompliant; last argument is not used

getStuff();
function getStuff(){
  var j=o;
  if(j>1000){
    if(j>1100){
      if(j>1200){
        if(j>1300){
          if(j>1400){
            if(j>1500){
              if(j>1600){
                j=500;
              }
              else{
                  var y = 500;
              }

            }
          }
        }
      }
    }
  }
}

var iframe = document.getElementById("testiframe");
iframe.contentWindow.postMessage("secret", "*"); // Noncompliant: * is used


const cp = require('child_process');
module.exports.index = async function (req, res) {
  const value = req.query.value;

  res.setHeader("Set-Cookie", value);  // Noncompliant
  res.cookie("connect.sid", value);  // Noncompliant
  
  
  //-- New --

if (!("prop" in myObj)) {  // Noncompliant;  "in" operator is checking property "false"
  doTheThing();  // this block will be never executed
}
