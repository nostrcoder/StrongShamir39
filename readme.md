# StrongShamir39 Tool

A tool for converting BIP39 mnemonic phrases to shamir secret sharing scheme parts whilst retaining the benefit of mnemonics.

The idea (and the UI) is inspired by Ian Coleman's Shamir39 but the cryptography is stronger (like in ssss).

## Improvements over Ian Coleman's Shamir39:
- shorter mnemonic: only one word more than bip39
- stronger cryptography: instead of GF(2^8) uses GF(2^n), where n is enthropy length, meaning GF(2^128) for 12-word bip39 mnemonic or GF(2^256) for a 24-word bip39 mnemonic, but any other bip39 mnemonic between 3 and 96 words works (with dynamic GF dimension).
- integrity checks: bip39- and StrongShamir39- checksum
- bip39 compatibility: for x word bip39 phrase, you can store the last x words of StrongShamir39 mnemonic and the share number, then the mnemonic part is a valid bip39 mnemonic (meaning: for an attacker it looks like a bip39 seed)

## Online Version

[nostrcoder.github.io/StrongShamir39/](https://nostrcoder.github.io/StrongShamir39/)

## Standalone offline version

Download `standalone.html`

Open the file in a browser by double clicking it.

This can be compiled from source using the command `python compile.py`

## Usage

1. Web interface here: [nostrcoder.github.io/StrongShamir39/src/index.html](https://nostrcoder.github.io/StrongShamir39/src/index.html),

or here: [nostrcoder.github.io/StrongShamir39/standalone.html](https://nostrcoder.github.io/StrongShamir39/standalone.html)

3. Coding examples will be provided

## Making changes

Please do not make modifications to `standalone.html`, since they will
be overwritten by `compile.py`.

Make changes in `src/*` and apply them using the command `python compile.py`

# ToDo

* update UI texts
* implement automatic testing routines
* provide coding examples
* implement quality of shamir shares (the more similar a share is to the initial bip39 mnemonic, the less secure it is for the given bip39 mnemonic. compute the digital distance as a quality measure)
* maybe: make another version with 2-level shares (groups and members like in SLIP39)

# License

This StrongShamir39 tool is released under the terms of the MIT license. See LICENSE for
more information or see https://opensource.org/licenses/MIT.
