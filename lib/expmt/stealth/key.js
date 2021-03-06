var Keypair = require('../../keypair');
var Privkey = require('../../privkey');
var Pubkey = require('../../pubkey');
var Point = require('../../point');
var Hash = require('../../hash');
var KDF = require('../../kdf');
var cmp = require('../../cmp');

var SKey = function SKey(payloadKeypair, scanKeypair) {
  if (!(this instanceof SKey))
    return new SKey(payloadKeypair, scanKeypair);

  if (payloadKeypair instanceof Keypair) {
    this.set({
      payloadKeypair: payloadKeypair,
      scanKeypair: scanKeypair
    });
  }
  else if (payloadKeypair) {
    var obj = payloadKeypair;
    this.set(obj);
  }
};

SKey.prototype.set = function(obj) {
  this.payloadKeypair = obj.payloadKeypair || this.payloadKeypair;
  this.scanKeypair = obj.scanKeypair || this.scanKeypair;
  return this;
};

SKey.prototype.fromJSON = function(json) {
  this.set({
    payloadKeypair: Keypair().fromJSON(json.payloadKeypair),
    scanKeypair: Keypair().fromJSON(json.scanKeypair)
  });
  return this;
};

SKey.prototype.toJSON = function() {
  return {
    payloadKeypair: this.payloadKeypair.toJSON(),
    scanKeypair: this.scanKeypair.toJSON()
  };
};

SKey.prototype.fromRandom = function() {
  this.payloadKeypair = Keypair().fromRandom();
  this.scanKeypair = Keypair().fromRandom();

  return this;
};

SKey.prototype.getSharedKeypair = function(senderPubkey) {
  var sharedSecretPoint = senderPubkey.point.mul(this.scanKeypair.privkey.bn);
  var sharedSecretPubkey = Pubkey({point: sharedSecretPoint});
  var buf = sharedSecretPubkey.toDER(true);
  var sharedKeypair = KDF.sha256hmac2keypair(buf);

  return sharedKeypair;
};

SKey.prototype.getReceivePubkey = function(senderPubkey) {
  var sharedKeypair = this.getSharedKeypair(senderPubkey);
  var pubkey = Pubkey({point: this.payloadKeypair.pubkey.point.add(sharedKeypair.pubkey.point)});

  return pubkey;
};

SKey.prototype.getReceiveKeypair = function(senderPubkey) {
  var sharedKeypair = this.getSharedKeypair(senderPubkey);
  var privkey = Privkey({bn: this.payloadKeypair.privkey.bn.add(sharedKeypair.privkey.bn).mod(Point.getN())});
  var key = Keypair({privkey: privkey});
  key.privkey2pubkey();

  return key;
};

SKey.prototype.isForMe = function(senderPubkey, myPossiblePubkeyhashbuf) {
  var pubkey = this.getReceivePubkey(senderPubkey);
  var pubkeybuf = pubkey.toDER(true);
  var pubkeyhash = Hash.sha256ripemd160(pubkeybuf);

  if (cmp.eq(pubkeyhash, myPossiblePubkeyhashbuf))
    return true;
  else
    return false;
};

module.exports = SKey;
