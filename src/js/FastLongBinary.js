// This version of LongBinary (FastLongBinary) 
// implements long binary chains using Uint32Array 
// for speed of binary operations
// WARNING: It doesn't track the exact length of the binary chain
// BUT: It isn't needed in the context of Galois Fields
//      since the computations in GF are done modulo (irreversible Polynomial)

class FastLongBinary {
  constructor(value) {
    if (value == undefined) {
      this.array = new Uint32Array(1);
    } else {
      this.set(value);
    }
  }


  set(value) {
    if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
      this._readInt(value);
    } else if (typeof value === "string") {
      this._readString(value);
    } else if (Array.isArray(value) || value instanceof Uint32Array) {
      this.array = new Uint32Array(value);
    } else {
      throw "Value " + value + " is not correct for LongBinary"
    }

    return this;
  }

  _readInt(value) {
    if (value == 0) {
      this.array = new Uint32Array(1);
      this.array[0] = 0;
      return this
    }

    // value != 0 (important for log)
    let bits = Math.ceil(Math.log2(value)) + 1;
    this.array = new Uint32Array(Math.ceil(bits / 32));

    let index = 0;
    while (value > 0) {
      this.array[index] = value & 0xFFFFFFFF;
      value = Math.floor(value / Math.pow(2, 32));
      index++;
    }
    return this;
  }

  _readString(str) {
    if (str == '') {
      this.set(0);
      return this;
    }
    if (/[^01]/.test(str)) {
      throw "Value " + str + "is not correct for LongBinary"
    }
    let chunkSize = 32;
    let bits = str.length;
    let arrSize = Math.ceil(bits / chunkSize);
    let res = new Uint32Array(arrSize);

    // pad str to the full size 
    str = "0".repeat(arrSize * 32 - bits) + str;

    for (let i = 0; i < arrSize; i++) {
      let chunk = str.slice(i * 32, i * 32 + chunkSize);
      res[arrSize - i - 1] = parseInt(chunk, 2);
    }

    this.array = res;
    return this;
  }

  copy() {
    return new LongBinary(this.array);
  }

  toString() {
    return this.toBinString();
  }

  toBinString() {
    let arr = Array.from(this.array)
    return arr.reverse().map(value => value.toString(2).padStart(32, '0')).join("");
  }

  getHi(height) {
    return Math.floor(height / 32);
  }

  getLo(height) {
    return height % 32;
  }

  getBit(height) {
    let index = Math.floor(height / 32);
    let position = height % 32;
    if (index >= this.array.length) {
      return 0;
    } else {
      return (this.array[index] & (1 << position)) ? 1 : 0;
    }
  }

  setBit(height) {
    const index = Math.floor(height / 32);
    const position = height % 32;

    // If the index is greater than or equal to the current length, resize the Uint32Array
    if (index >= this.array.length) {
      const newArray = new Uint32Array(index + 1);
      newArray.set(this.array);
      this.array = newArray;
    }

    // Set the specified bit
    this.array[index] |= (1 << position);

    return this; // Return the instance to allow method chaining
  }

  // UNARY OPERATORS: not, inc, dec

  not() {
    let res = new LongBinary(); // Creating a new instance
    res.array = new Uint32Array(this.array.length);

    for (let i = 0; i < this.array.length; i++) {
      res.array[i] = ~this.array[i]; // Inverting the bits using the bitwise NOT operator
    }

    return res; // Return the new instance
  }

  lshift(bits) {

    if (bits === 0) return this.copy(); // If shifting by 0 bits, return a copy

    bits = bits || 1;

    const fullChunks = Math.floor(bits / 32);
    const remainingBits = bits % 32;

    // Create a new Uint32Array with space for the shifted bits
    const newArray = new Uint32Array(this.array.length + fullChunks + 1);

    // Shift by full 32-bit chunks
    for (let i = 0; i < this.array.length; i++) {
      newArray[i + fullChunks] = this.array[i];
    }

    // Shift by remaining bits
    if (remainingBits > 0) {
      for (let i = newArray.length - 1; i > 0; i--) {
        newArray[i] <<= remainingBits;
        newArray[i] |= newArray[i - 1] >>> (32 - remainingBits);
      }
      newArray[0] <<= remainingBits;
    }

    // Create a new LongBinary instance with the shifted array
    const res = new LongBinary();
    res.array = newArray;
    return res;
  }

  rshift(bits) {

  if (bits === 0) return this.copy(); // If shifting by 0 bits, return a copy

  bits = bits || 1; // Default value of bits is 1 if not provided

  var fullChunks = Math.floor(bits / 32);
  var remainingBits = bits % 32;

  if (fullChunks >= this.array.length) return new LongBinary(0); // If shifting by more than the length, return 0

  // Create a new array with space for the shifted bits
  var newArray = new Uint32Array(this.array.length - fullChunks);

  // Shift by full 32-bit chunks
  for (var i = 0; i < newArray.length; i++) {
    newArray[i] = this.array[i + fullChunks];
  }

  // Shift by remaining bits
  if (remainingBits > 0) {
    for (var i = 0; i < newArray.length - 1; i++) {
      newArray[i] = newArray[i] >>> remainingBits;
      newArray[i] |= (newArray[i + 1] & ((1 << remainingBits) - 1)) << (32 - remainingBits);
    }
    newArray[newArray.length - 1] = newArray[newArray.length - 1] >>> remainingBits;
  }

  // Create a new LongBinary instance with the shifted array
  var res = new LongBinary();
  res.array = newArray;
  return res;
}

// BINARY OPERATORS: xor, or, and

  xor(lb) {
    // Determine the length of the result array based on the longer of the two input arrays
    var resultLength = Math.max(this.array.length, lb.array.length);
    var resultArray = new Uint32Array(resultLength);
  
    // Iterate through both arrays, performing a bitwise XOR on corresponding elements
    for (var i = 0; i < resultLength; i++) {
      var thisValue = this.array[i] || 0; // Use 0 if there is no corresponding element in this.array
      var lbValue = lb.array[i] || 0; // Use 0 if there is no corresponding element in lb.array
      resultArray[i] = thisValue ^ lbValue;
    }
  
    // Create a new LongBinary instance with the resulting array
    var res = new LongBinary();
    res.array = resultArray;
    return res;
  }
  
// Methods for interpretation as a Number

  getDegree() {
    // Iterate through the Uint32Array from the end towards the beginning
    for (let i = this.array.length - 1; i >= 0; i--) {
      let chunk = this.array[i];
      if (chunk !== 0) {
        // If a non-zero chunk is found, identify the position of the highest 1-bit within the chunk
        return i*32 + Math.floor(Math.log2(chunk));
      }
    }
  
    return 0; // Return 0 if no 1-bits are found
  }
  
  normalize() {
    let res = new LongBinary();
    let length = 1;
    for (let i = this.array.length - 1; i >= 0; i--) {
      if (this.array[i] !== 0) {
        // If a non-zero chunk is found, identify the position of the highest 1-bit within the chunk
        length = i+1;
        break;
      }
    }

    let newArray = new Uint32Array(length);
    for (let i = 0; i < length; i++) {
      newArray[i] = this.array[i];
    }
  
    // Update the array property with the normalized representation
    this.array = newArray;
  
    return this;

  }

  pad(bits) {
    let res = new LongBinary();
    let arrSize = Math.ceil(bits / 32);

    if (arrSize <= this.array.length) {
      // ATTENTION!!! Potentially cuting out some significant bits!
      res.array = this.array.slice(0, arrSize);
    } else {
      res.array = new Uint32Array(arrSize);
      for (let i=0;i<this.array.length;i++) {
        res.array[i] = this.array[i];
      }
    }

    return res;
  }

    
  isZero() {
    return (this.getDegree() == 0 && !(this.array[0])); // boolean
  }
  
}

// for node.js:
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  // Running in Node.js
  module.exports = FastLongBinary;
}