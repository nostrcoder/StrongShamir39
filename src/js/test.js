const { GF, randomElement, getShares, lagrange } = require("./StrongSSS.js");

console.time('myFunction');

function myFunction(times) {
  for (let i = 0; i < times; i++) {
    let gf = new GF(1024);
    let secret = randomElement(gf).toString();
    let shares = getShares(secret, 15, 5)
    console.log(shares);
    let res = lagrange(shares.slice(0, 2));
    console.log(res.toString());
  }
}

myFunction(1);

console.timeEnd('myFunction');
