// for node.js:
//const GF = require('./BigGF.js');
const GF = BigGF;

// Returns a random element of gf
function randomElement(gf) {
  let degree = gf.degree;
  let binStr = getRandomBinStr(degree);
  return gf.getElement(binStr);
}

// Returns a pseudo-random string of '0' and '1' 
// with the length = bits
function getRandomBinStr(bits) {

  let bytes = Math.ceil(bits / 8);
  let byteArray = [];

  if (typeof require === 'function' && (crypto = require('crypto')) && (randomBits = crypto['randomBytes'])) {
    // console.log("Using node.js function randomBytes() for randomness")
    // node.js crypto.randomBytes()
    byteArray = Array.from(randomBits(bytes));

  } else if (typeof window !== 'undefined' && window['crypto'] && typeof window['crypto']['getRandomValues'] === 'function' && typeof window['Uint32Array'] === 'function') {
    // console.log("Using browser's crypto function getRandomValues() for randomness")
    // browsers with window.crypto.getRandomValues()

    let uArray = new window['Uint8Array'](bytes);
    window['crypto']['getRandomValues'](uArray);
    byteArray = Array.from(uArray);

  } else {
    // A totally insecure RNG!!! (except in Safari)
    // Will produce a warning every time it is called.
    // console.log("Using unsecure Math.random() function for randomness")

    let alertStr = 'WARNING:\nA secure random number generator was not found.\nUsing Math.random(), which is NOT cryptographically strong!'
    console.warn(alertStr);
    if (typeof window !== 'undefined' && typeof window['alert'] === 'function') {
      window['alert'](alertStr);
    }

    for (let i = 0; i < bytes; i++) {
      byteArray[i] = Math.floor(Math.random() * 256);
    }

  }

  let binStrs = byteArray.map(function(byte) {
    let str = byte.toString(2);
    return '0'.repeat(8 - str.length) + str;
  });

  let binStr = binStrs.join('').slice(0, bits);

  return binStr;
};

// TODO: add array of 01 to LongBinary.set
// This is the basic SSS function
// secret can be:
// - a 01-string
// - an array of booleans
// - an array of 01 (to be implemented in LongBinary.set)
function getShares(secret, numShares, threshold) {

  let degree = secret.length;
  let gf = new GF(degree);

  secret = gf.getElement(secret)

  let shares = [];
  let coeffs = [secret];

  // set the coeffs of the solution polynomial (coeffs are elements of GF)
  // f(x) = c[0] + c[1]*x + c[2]*x^2 + c[3]*x^3 + ... + c[n]*x^n, n=threshhold-1
  // set c[0] = secret
  // set c[i] randomly for all i>0
  // it works, since then f(x) = c[0] = secret
  // for threshold = 1 => n=0
  // for threshold = 2 => n=1, linear polynomial
  // for threshold = 3 => n=2, quadratic polynomial
  for (let i = 1; i < threshold; i++) {
    do {
      coeffs[i] = randomElement(gf);
    } while (i == threshold - 1 && coeffs[i].isZero()); //highest coeff must be non-zero
    // otherwise less than threshhold shares suffice for reconstruction!
    // so repeat if the highest coeff is zero
  }
  console.log('coeffs: ' + coeffs);

  // compute the values of f(x) at the x-points 1,...,numShares
  for (var i = 1, len = numShares + 1; i < len; i++) {
    shares[i - 1] = {
      x: i,
      y: horner(gf.getElement(i), coeffs, gf).pad(gf.degree).toBinString()
    }
  }

  return shares;
}

// evaluate the polynomial given by coeffs at x
// note: coeffs are themselves elements of GF
function horner(x, coeffs, gf) {
  y = gf.getElement(0);
  for (i = coeffs.length - 1; i > 0; i--) {
    y = gf.add(y, coeffs[i]);
    y = gf.mul(y, x);
  };
  y = gf.add(y, coeffs[0]);
  return y;
}

/*

console.log("GET SHARES")
let secret = '00011100';
console.log("secret: " + secret);
let shares = getShares(secret, 3, 3);
for (i = 0; i < shares.length; i++) {
  console.log("share " + shares[i]['x'] + ': ' + shares[i]['y']);
  //console.log(shares[i]['y']);
}


console.log()
console.log("HORNER")

function testHorner(x, coeffs) {
  gf = new GF(8);
  x = gf.getElement(x);
  coeffs = coeffs.map(function(value) {
    return gf.getElement(value);
  });
  console.log('x=' + x + ', coeffs=' + coeffs + ' => ' + horner(x, coeffs, gf))
}

testHorner(2, [4, 5]);
testHorner(3, [1, 2, 3]);
testHorner(255, [1, 0, 1, 0, 1, 0, 1, 1])
testHorner(255, [1, 2, 3, 4, 5, 6, 7, 8])

function zeroPolynomial(gf) {
  return [gf.getElement(0)];
}

// a, b are polynomials with coefficients in the GF
// represented as arrays of GF instances
function addPolynomials(a, b, gf) {
  if (a.length > b.length) {
    //swap the arrays
    let temp = a;
    a = b;
    b = temp;
  }; // now b is longer than a

  let res = b.slice()
  for (let i = 0; i < a.length; i++) {
    res[i] = gf.add(b[i], a[i]); // use the add function of the GF  
  }

  return res;
}

// multiplies Polynomial with the constant k in GF
function simpleMulPoly(k,a, gf) {  
  if(k.isZero()) return [gf.getElement(0)];
  
  let res = [];
  for(let i = 0; i<a.length;i++) {
    res[i] = gf.mul(a[i],k);
  }
  return res;
}

// a, b are polynomials with coefficients in the GF
// represented as arrays of GF instances
function mulPolynomials(a, b, gf) {
//  console.log()
//  console.log(a+" * "+b+':')
  let h;
  let product = [gf.getElement(0)]; // product = 0
  while (b.length > 0) { // while b not a zero polynomial (empty array)
    if (!b[0].isZero()) {
      h = simpleMulPoly(b[0],a,gf)
//    console.log('h='+h)
      product = addPolynomials(product, h, gf);
//    console.log('h='+h)    
    }
    a.unshift(gf.getElement(0)); // multiply by x, i.e. insert 0 at the beginning of the coeff array 
    b.shift(); //take away the lowest coeff
//    console.log('p='+product)
//    console.log('a='+a)
//    console.log('b='+b)
  }
  return normalizePolynomial(product);
}

function normalizePolynomial(a) {
  let i=a.length;
  while(a[i-1].isZero() && i>1) {
    i--;
  }
  return a.slice(0,i);
}

console.log()
console.log("ZERO POLYNOMIAL")
myGF = new GF(8);
zero = zeroPolynomial(myGF);
console.log(zero);

console.log()
console.log("POLYNOMIAL ADDITION")
function testAddPolynomials(a, b) {
  console.log(a + ' + ' + b + ' = ' + addPolynomials(a, b, myGF))

}

function testAddRandomPolynomials() {
  deg1 = Math.ceil(Math.random() * 3)
  poly1 = []
  for (let i = 0; i <= deg1; i++) {
    poly1.push(myGF.getElement(Math.floor(Math.random() * 5)));
  }

  deg1 = Math.ceil(Math.random() * 3)
  poly2 = []
  for (let i = 0; i <= deg1; i++) {
    poly2.push(myGF.getElement(Math.floor(Math.random() * 5)));
  }

  testAddPolynomials(poly1, poly2)
}

for (j = 0; j < 5; j++) {
  testAddRandomPolynomials()
}

zero = gf.getElement(0);
one = gf.getElement(1);
two = gf.getElement(2);
three = gf.getElement(3);

console.log()
console.log("SIMPLE POLYNOMIAL MULTIPLICATION")
function testSimpleMul(a, k) {
  console.log(a + ' * ' + k + ' = ' + simpleMulPoly(k, a, myGF))

}

testSimpleMul([one],zero);
testSimpleMul([one],one);
testSimpleMul([one,one],zero);
testSimpleMul([zero,one],one);
testSimpleMul([one,two],zero);
testSimpleMul([zero,one],two);
testSimpleMul([two,zero,one],two);
testSimpleMul([two,zero,one],zero);


console.log()
console.log("POLYNOMIAL MULTIPLICATION")
function testMulPolynomials(a, b) {
  console.log(a + ' * ' + b + ' = ' + mulPolynomials(a, b, myGF))

}

function testMulRandomPolynomials() {
  deg1 = Math.round(Math.random() * 3)
  poly1 = []
  for (let i = 0; i <= deg1; i++) {
    poly1.push(myGF.getElement(Math.floor(Math.random() * 5)));
  }

  deg1 = Math.round(Math.random() * 3)
  poly2 = []
  for (let i = 0; i <= deg1; i++) {
    poly2.push(myGF.getElement(Math.floor(Math.random() * 5)));
  }

  testMulPolynomials(poly1, poly2)
}

for (j = 0; j < 10; j++) {
  testMulRandomPolynomials()
}

console.log()
console.log("NORMALIZE POLYNOMIAL")

function testNormalizePolynomial(a) {
  console.log(a + " > " + normalizePolynomial(a))
}

testNormalizePolynomial([one]);
testNormalizePolynomial([zero]);
testNormalizePolynomial([zero,one]);
testNormalizePolynomial([one,zero]);
testNormalizePolynomial([zero,zero]);
testNormalizePolynomial([zero,one,zero]);
testNormalizePolynomial([zero,one,one]);
testNormalizePolynomial([one,zero,zero]);
testNormalizePolynomial([zero,zero,zero]);

*/

// points are formatted like the output for getShares
// compute only the f(x) for x=0
// meaning look at x^0 only
// no polynomial multiplication needed!
function lagrange(points) {

  let degree = points[0]['y'].length;
  let gf = new GF(degree);

  let fAt0 = [];
  let yAt0 = gf.getElement(0);
  for (let i = 0; i < points.length; i++) {
    fAt0[i] = gf.getElement(points[i]['y']);
    //    console.log('fAt0['+i+']='+fAt0[i])
    for (let j = 0; j < points.length; j++) {
      if (i != j) {
        let numerator = gf.getElement(points[j]['x']);
        //        console.log('numerator='+numerator)
        let denumerator = gf.sub(gf.getElement(points[i]['x']), gf.getElement(points[j]['x']));
        //        console.log('denumerator='+denumerator)
        numerator = gf.mul(numerator, gf.inv(denumerator));
        //        console.log('term='+numerator)
        fAt0[i] = gf.mul(fAt0[i], numerator);
        //        console.log('fAt0['+i+']='+fAt0[i])    
      }
    }
    yAt0 = gf.add(yAt0, fAt0[i]).pad(degree);
    //    console.log('yAt0='+yAt0)    
  }
  return yAt0;
}


/*

console.log()
console.log("COMBINE")

result = lagrange(shares);
console.log("lagrange: " + result)

function testShareAndCombine(degree) {
  console.log()
  console.log("SHARE & COMBINE")
  secret = randomElement(new GF(degree)).pad(degree).toBinString();
  console.log("secret:  " + secret);
  let numshares = Math.floor(Math.random() * 4) + 3
  let threshhold = Math.floor(Math.random() * (numshares - 4)) + 3
  console.log(threshhold + ' out of ' + numshares);
  let shares = getShares(secret, numshares, threshhold);
  for (i = 0; i < shares.length; i++) {
    console.log("share " + shares[i]['x'] + ': ' + shares[i]['y']);
    //console.log(shares[i]['y']);
  }
  shares = shares.slice(0, threshhold + 1);
  combination = lagrange(shares);
  console.log('combine: ' + lagrange(shares));
  //  secret = '0' + secret.substring(1);
  if (secret == combination.toBinString()) {
    console.log("SUCCESS!");
  } else {
    console.log("FAILED!")
  };
}

for (let i = 0; i < 5; i++) {
  testShareAndCombine(256);
}

*/

// for node.js:
// module.exports = { getShares, lagrange };

/*
function testR(bits) {
  console.log(bits + ' bits: ' + getRandomBinStr(bits));
}

testR(1);
testR(2);
testR(8);
testR(9);
testR(10);
testR(16);
testR(17);

*/