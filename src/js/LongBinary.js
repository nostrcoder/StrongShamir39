// This version of LongBinary
// implements long binary chains using an array of booleans 
// It exactly represents the length of each chain
// but this precision isn't needed in the context of Galois Fields
// IT IS MUCH SLOWER than FastLongBinary and it isn't currently used in StrongShamir39

class LongBinary {
  constructor(value, bits) {
    // create with value 0
    if (value == undefined) {
      this.array = [false];
    } else {
      this.set(value, bits);
    }
  }

  // TODO: test
  // value: string of 0 and 1, or an integer value, or an array of booleans
  // bits (optional): the number of bits in the representation
  set(value, bits) {
    if (typeof value === "string") {
      this._readString(value);
    } else if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
      this._readInt(value);
    } else if (Array.isArray(value) && value.every(x => typeof x === 'boolean')) {
      this.array = value;
    } else {
      throw "Value " + value + " is not correct for LongBinary"
    }

    // process 2nd parameter
    if (bits != undefined) {
      // adjust the array to the length = bits
      if (bits > this.array.length) {
        // add bits and fill with zeros
        let arr2 = new Array(bits - this.array.length).fill(false);
        this.array = this.array.concat(arr2);
      } else if (bits < this.array.length) {
        // shorten array
        this.array = this.array.slice(0, bits - 1);
      }
    }

    return this;
  }

  copy() {
    return new LongBinary(this.array);
  }

  _readInt(value) {
    if (value == 0) {
      this.array = [false];
      return this;
    }

    this.array = [];
    while (value > 0) {
      this.array.push(value & 1 ? true : false);
      value >>= 1
    }
    return this;
  }

  _readString(str) {
    if (/[^01]/.test(str)) {
      throw "Value " + str + "is not correct for LongBinary"
    }
    this.array = str.split('').map(value => value == '1').reverse();
    return this;
  }

  toString() {
    return this.toBinString();
  }

  toBinString() {
    return this.array.map(value => value ? "1" : "0").reverse().join("");
  }

  toBoolArray() {
    return this.array.slice();
  }

  getBit(height) {
    if (height >= this.array.length) {
      return 0;
    } else {
      return (this.array[height] ? 1 : 0);
    }
  }

  setBit(height) {
    var res = this.copy();
    if (height < res.array.length) {
      res.array[height] = true;
    } else {
      var arr2 = new Array(height - res.array.length + 1).fill(false);
      arr2[arr2.length - 1] = true;
      res.array = res.array.concat(arr2);
    }
    return res;
  }

  // Not needed?
  /*  
    padWithZero(bits) {
      var res = new LongBinary();
      var pad = new Array(bits).fill(false);
      res.array = this.array.concat(pad);
      return res;
    }
  */


  // UNARY OPERATORS: not, inc, dec

  not() {
    var res = new LongBinary();
    res.array = this.array.map(value => !value);

    return res;
  }

  lshift(bits) { // bits is int
    if (bits == undefined) {
      bits = 1;
    };
    var res = new LongBinary();
    res.array = new Array(bits).fill(false);
    res.array = res.array.concat(this.array);

    return res;
  }

  rshift(bits) { // bits is int
    if (bits == undefined) {
      bits = 1;
    };
    var res = new LongBinary();
    res.array = this.array.slice(bits, this.array.length);
    if (res.array.length == 0) res.set(0);

    return res;
  }

  // splits this.array and lb into 3 parts
  // used in bit operations with 2 operands
  // op1 - is the beginning of this.array upto the common length
  // op2 - is the bebinning of lb upto the common length
  // rest - is the rest either of this.array or lb
  _split4ops(lb) {
    let minLength = Math.min(this.array.length, lb.array.length);
    let op1 = this.array.slice(0, minLength);
    let op2 = lb.array.slice(0, minLength);
    let rest = [];
    if (lb.array.length > minLength) {
      rest = lb.array.slice(minLength, lb.array.length);
    } else if (this.array.length > minLength) {
      rest = this.array.slice(minLength, this.array.length);
    }
    return [op1, op2, rest]; // op1, op2, rest are boolean lists
  }

  // BINARY OPERATORS: xor, or, and

  xor(lb) {
    let res = new LongBinary();

    let [op1, op2, rest] = this._split4ops(lb);
    res.array = op1.map((value, index) => Boolean(value ^ op2[index]));
    res.array = res.array.concat(rest);

    return res;
  }

  or(lb) {
    let res = new LongBinary();

    let [op1, op2, rest] = this._split4ops(lb);
    res.array = op1.map((value, index) => Boolean(value || op2[index]));
    res.array = res.array.concat(rest);

    return res;
  }

  and(lb) {
    let res = new LongBinary();

    let [op1, op2, rest] = this._split4ops(lb);
    res.array = op1.map((value, index) => Boolean(value && op2[index]));
    rest = new Array(rest.length).fill(false);
    res.array = res.array.concat(rest);

    return res;
  }

  getLength() {
    return this.array.length;
  }

  // Methods for interpretation as a Number

  // what's the degree of the polynomial represented by lb?
  // what's the highest power of 2 in lb?
  getDegree() {
    let x = this.array.length - 1;
    while (x > 0) {
      if (this.array[x]) return x; // returns integer
      x = x - 1;
    }
    return 0; // integer
  }

  normalize() {
    let res = new LongBinary();
    res.array = this.array.slice(0, this.getDegree() + 1);
    return res; // LongBinary    
  }

  // pad with 0 to the size
  pad(size) {
    let res = this.copy();

    if (size <= this.array.length) {
      // ATTENTION!!! Potentially cuting out some significant bits!
      res.array = this.array.slice(0, size);
    } else {
      let arr2 = new Array(size - this.array.length).fill(false);
      res.array = res.array.concat(arr2);
    }

    return res;
  }

  isZero() {
    let x = this.normalize();
    return (x.getDegree() == 0 && !x.array[0]); // boolean
  }

}

// for node.js:
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  // Running in Node.js
  module.exports = LongBinary;
}