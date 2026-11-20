// makes sample-interns.csv next to this file: 60 rows, 5 of them are bad
// run it with: node docs/make-sample-csv.js
const fs = require("fs");

const lines = ["name,email,password,domain"];
for (let i = 1; i <= 60; i++) {
  lines.push(
    `Intern ${i},intern${i}@example.com,password123,MERN / MEAN Stack`,
  );
}

lines[5] = "Intern 5,not-an-email,password123,MERN / MEAN Stack";
lines[12] = "Intern 12,intern12@example.com,short,MERN / MEAN Stack";
lines[20] = "Intern 20,intern20@example.com,password123,Cooking";
lines[30] = ",intern30@example.com,password123,MERN / MEAN Stack";
lines[40] = "Intern 40,intern1@example.com,password123,MERN / MEAN Stack";

fs.writeFileSync(__dirname + "/sample-interns.csv", lines.join("\n"));
console.log("done, wrote sample-interns.csv");
