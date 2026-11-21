import Random "mo:core/Random";
import Blob "mo:core/Blob";
import Nat8 "mo:core/Nat8";
import Text "mo:core/Text";

module {
  public func hex() : async Text {
    let bytes = (await Random.blob()).toArray();
    let alphabet = "0123456789abcdef".toArray();
    var result = "";
    for (byte in bytes.values()) {
      let n = byte.toNat();
      result #= Text.fromChar(alphabet[n / 16]) # Text.fromChar(alphabet[n % 16]);
    };
    result;
  };
}
