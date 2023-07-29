// for node.js:
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  // Running in Node.js
  var GF = require('./BigGF.js');
} else {
  // Running in browser  
  var GF = BigGF;
}

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
  //console.log('coeffs: ' + coeffs);

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

// points are formatted like the output for getShares
// compute only the f(x) for x=0
// meaning look at x^0 only
// no polynomial multiplication needed!
function lagrange(points) {

  let degree = points[0]['y'].length;
  let gf = new GF(degree);

  // precompute the x-coeffs of points as GF-elements
  // and their product xProduct
  let x = [];
  let xProcuct;
  for (let i = 0; i < points.length; i++) {
    x[i] = gf.getElement(points[i]['x']);
    if (i == 0) {
      xProduct = x[0];
    } else {
      xProduct = gf.mul(xProduct, x[i]);
    };
  }

  // precompute differences and inverses and product of all x (xProduct)
  // many inverses repeat
  let dif = [];
  for (let i = 0; i < points.length; i++) {
    dif[i] = [];
    for (let j = 0; j < i; j++) {
      dif[i][j] = gf.sub(x[i], x[j]);
    }
  }

  // compute lagrange polynomial given by points at x=0
  // meaning: compute the lowest coeff of this polynomial
  let yAt0 = gf.getElement(0);
  for (let i = 0; i < points.length; i++) {
    let denumerator = x[i];
    for (let j = 0; j < points.length; j++) {
      if (i != j) {
        let term = dif[Math.max(i, j)][Math.min(i, j)];
        denumerator = gf.mul(denumerator, term);
      }
    }
    let inverse = gf.inv(denumerator);

    let enumerator = gf.getElement(points[i]['y']);
    enumerator = gf.mul(inverse,enumerator);
    
    yAt0 = gf.add(yAt0, enumerator);
  }
  yAt0 = gf.mul(yAt0,xProduct);
  yAt0 = yAt0.pad(degree);
  return yAt0;
}

// for node.js:
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  // Running in Node.js
  module.exports = { GF, randomElement, getShares, lagrange };
}