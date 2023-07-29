// for node.js:
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  // Running in Node.js
  var { GF, randomElement, getShares, lagrange } = require('./StrongSSS.js');
  var sjcl = require('./sjcl-bip39.js');
}

StrongShamir39 = function() {

  var VERSION = "strongshamir39-v1";

  // Splits a BIP39 mnemonic into Shamir39 mnemonics.
  // No validation is done on the bip39 words.
  this.split = function(bip39MnemonicWords, wordlist, m, n) {
    // validate inputs
    if (m < 2) {
      return {
        error: "Must require at least 2 shares"
      };
    }
    if (m > 31) {
      return {
        error: "Must require at most 15 shares"
      };
    }
    if (n < 2) {
      return {
        error: "Must split to at least 2 shares"
      };
    }
    if (n > 31) {
      return {
        error: "Must split to at most 15 shares"
      };
    }
    if (m > n) {
      return {
        error: "Number of shares smaller than threshold!"
      }
    }
    if (wordlist.length != 2048) {
      return {
        error: "Wordlist must have 2048 words"
      };
    }
    if (bip39MnemonicWords.length == 0) {
      return {
        error: "No bip39 mnemonic words provided"
      };
    }
    if (bip39MnemonicWords.length % 3) {
      return {
        error: "Wrong number of bip39 mnemonic words"
      };
    }

    // validate the bip39 checksum

    // convert bip39 mnemonic into bits
    // no checksum checking here!!!
    var binStr = "";
    for (var i = 0; i < bip39MnemonicWords.length; i++) {
      let w = bip39MnemonicWords[i];
      let index = wordlist.indexOf(w);
      if (index == -1) {
        return {
          error: "Invalid word found in list: " + w
        };
      }
      var bits = index.toString(2);
      bits = lpad(bits, 11);
      binStr = binStr + bits;
    }

    //console.log('mnemonic: ' + bip39MnemonicWords)
    //console.log('binstr: ' + binStr);

    // binStr is now binary String (string of 0s and 1s) representation of the seed (including the checksum)
    // length of binStr should be divisible by 33  

    // secret is the first 32/33 characters of 

    secret = binStr.slice(0, 32 * binStr.length / 33);
    //console.log('secret: ' + secret);

    lastBits = binStr.slice(32 * binStr.length / 33, binStr.length)
    // validate the bip39 checksum
    let bip39CS = computeSHA256(secret, binStr.length / 33);
    //console.log("lastB: " + lastBits)
    //console.log("bip39: " + bip39CS)
    if (!(lastBits == bip39CS)) {
      return {
        error: "Invalid mnemonic. Wrong checksum!"
      };
    }

    let shares = getShares(secret, n, m)

    let mnemonics = [];
    for (let i = 0; i < shares.length; i++) {
      // Binary structure of a share:
      // [shamir39CS] = 3 bits, SHA256 of all following bits
      // [mBits] = 4 bits, minimum shares required
      // [xBits] = 4 bits, the share number, x-coordinate
      // -------- till here one 11-bit word from wordlist
      // [share] = 32*k bits, shamir secret share
      // [bip39CS] = 1*k bits, bip39 checksum of share
      // ------- till here n+1  11-bit words, whare n is the number of words in the bpi39 mnemonic

      let share = shares[i]['y'];

      // at the END of each share add the BIP39 checksum
      let bip39CS = computeSHA256(share, secret.length / 32);
      share = share + bip39CS;

      // at the beginning of each share add 4 bits for:
      // x - the share number
      let xBits = lpad(shares[i]['x'].toString(2), 4);
      share = xBits + share;

      // at the beginning of each share add 4 bits for:
      // m, minimum shares required
      let mBits = lpad(m.toString(2), 4);
      share = mBits + share;

      // at the beginning of each share add 3 bits of StrongShamir39 checksum
      let ss39CS = computeSHA256(share, 3);
      share = ss39CS + share;

      shares[i]['y'] = share;

      let mnemonic = [VERSION];
      let words = share.length / 11;
      for (j = 0; j < words; j++) {
        let wordBin = share.slice(j * 11, (j + 1) * 11);
        let word = wordlist[parseInt(wordBin, 2)];
        mnemonic.push(word);
      };
      shares[i]['mnemonic'] = mnemonic.slice();
      mnemonics.push(mnemonic.slice());
    }

    /*
    for (i = 0; i < shares.length; i++) {
      console.log("share " + shares[i]['x'] + ': ' + shares[i]['y']);
      console.log("mnemonic " + shares[i]['x'] + ': ' + shares[i]['mnemonic'].join(" "));
    }
    */

    return {
      mnemonics: mnemonics
    };
  }

  function binaryStringToHexString(binaryString) {
    hexString = "";
    for (var i = 0; i < Math.floor(binaryString.length / 4); i++) {
      hexString += parseInt(binaryString.slice(i * 4, i * 4 + 4), 2).toString(16);
    }
    return hexString;
  }

  function hexStringToBinaryString(hexString) {
    binaryString = "";
    for (var i = 0; i < hexString.length; i++) {
      binaryString += lpad(parseInt(hexString[i], 16).toString(2), 4);
    }
    return binaryString;
  }

  // sha256: 
  // input: 
  //   binStr: binary string, 
  //   length: number of bits for the checksum
  // output: binary string 
  function computeSHA256(binStr, length) {

    let data = sjcl.codec.hex.toBits(binaryStringToHexString(binStr));
    let hash = sjcl.hash.sha256.hash(data);
    let binStrHash = hexStringToBinaryString(sjcl.codec.hex.fromBits(hash));

    return binStrHash.slice(0, length);

  }

  // Combines StrongShamir39 mnemonics into a BIP39 mnemonic
  // parts is an array of string arrays, each of which represents one BIP39 word (or the version word if 1st)
  this.combine = function(parts, wordlist) {

    if (typeof parts === 'undefined' || typeof parts.length == 0) {
      return {
        error: "No shares to combine"
      };
    }

    // check whether 1st word is a version word
    // if so, check the version and cut off
    let ssMnemonicLength = 0;
    for (let i = 0; i < parts.length; i++) {
      let firstWord = parts[i][0];
      let wordIndex = wordlist.indexOf(firstWord);
      if (wordIndex == -1) { // not BIP39 word, check version
        if (firstWord == VERSION) { // remove version word
          parts[i].shift();
        } else {
          return {
            error: "Version doesn't match"
          };
        }
      };
      if (i == 0) {
        ssMnemonicLength = parts[0].length;
        if (((ssMnemonicLength % 3) != 1) || (ssMnemonicLength < 4)) {
          return {
            error: "Mnemonic length incompatible with " + VERSION
          };
        };
      } else {
        if (ssMnemonicLength != parts[i].length) {
          return {
            error: "Inconsistent mnemonic length"
          };
        };
      }
    }; // for

    //console.log(parts)
    // now  parts have mnemonics (as arrays of words) without leading version descriptor word

    // convert shares to binary string
    let shares = [];
    for (let i = 0; i < parts.length; i++) {
      let binStr = "";
      for (let j = 0; j < parts[i].length; j++) {
        let wordIndex = wordlist.indexOf(parts[i][j]);
        if (wordIndex == -1) {
          return {
            error: "Word not in wordlist: " + parts[i][j]
          }
        };
        let wordBin = lpad(wordIndex.toString(2), 11);
        binStr = binStr + wordBin;
      }
      let share = {
        y: binStr
      };
      shares.push(share);
    };

    //console.log(shares)

    // verify integrity of the shares, add x info
    let minShares = 0;
    for (let i = 0; i < shares.length; i++) {
      let shareBinStr = shares[i]['y'];
      let ss39CSBits = shareBinStr.slice(0, 3);
      let restBinStr = shareBinStr.slice(3, shareBinStr.length);
      if (ss39CSBits != computeSHA256(restBinStr, 3)) {
        return {
          error: "Wrong StrongShamir39 checksum in share " + (i + 1)
        };
      }

      let mBits = restBinStr.slice(0, 4);
      restBinStr = restBinStr.slice(4);
      if (i == 0) {
        minShares = parseInt(mBits, 2);
        if (minShares > shares.length) {
          return {
            error: "Not enough shares, requires " + minShares
          }
        }
      } else {
        if (minShares != parseInt(mBits, 2)) {
          return {
            error: "Inconsistent M parameters!"
          }
        }
      }

      let xBits = restBinStr.slice(0, 4);
      shares[i]['x'] = parseInt(xBits, 2);

      restBinStr = restBinStr.slice(4);

      // now in restBinStr only the shamir share + bip39 checksum
      let bip39CSLength = restBinStr.length / 33;
      let shareLength = 32 * bip39CSLength;
      let payloadBinStr = restBinStr.slice(0, shareLength);
      let bip39CSBits = restBinStr.slice(shareLength);
      if (bip39CSBits != computeSHA256(payloadBinStr, bip39CSLength)) {
        return {
          error: "Wrong BIP39 checksum in share " + (i + 1)
        };
      }
      shares[i]['y'] = payloadBinStr;
      //console.log(payloadBinStr.length)
    }

    if(shares.length == 0) {
        return {
          mnemonic: []
        };
      
    }

    // Here the shares are put together 
    //following Shamir Secret Sharing Algorithm:
    let secretBinStr = lagrange(shares).toString();
    
    //console.log(secretBinStr)

    // now compute bip39 checksum for secret
    let bip39CSBits = computeSHA256(secretBinStr, secretBinStr.length / 32);
    //let binStr = secretBinStr + bip39CS;
    let binStr = secretBinStr + bip39CSBits;

    //console.log(binStr)

    // convert binStr to mnemonic

    let mnemonic = [];
    let mnemonicLength = binStr.length / 11;
    for (let i = 0; i < mnemonicLength; i++) {
      let wordBits = binStr.slice(i * 11, (i + 1) * 11);
      let wordStr = wordlist[parseInt(wordBits, 2)];
      mnemonic.push(wordStr);
    }

    return {
      mnemonic: mnemonic
    };

  }

  // left-pad a number with zeros
  function lpad(s, n) {
    s = s.toString();
    while (s.length < n) {
      s = "0" + s;
    }
    return s;
  }

}

// for node.js:
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  // Running in Node.js
  module.exports = StrongShamir39;
}
