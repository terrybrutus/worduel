import Text "mo:core/Text";
import Blob "mo:core/Blob";
import Error "mo:core/Error";
import Prim "mo:⛔";
module {
  public type Header = { name : Text; value : Text };
  public type Response = { status : Nat; headers : [Header]; body : Blob };
  let management = actor("aaaaa-aa") : actor {
    http_request : shared { url : Text; method : { #get; #post }; headers : [Header]; body : ?Blob; max_response_bytes : ?Nat64;
      transform : ?{ function : shared query { response : Response; context : Blob } -> async Response; context : Blob }; is_replicated : ?Bool } -> async Response;
  };
  public func configured<system>() : Bool { switch (Prim.envVar<system>("ANTHROPIC_API_KEY")) { case (?key) key.size() > 0; case null false } };
  public func request<system>(url : Text, method : { #get; #post }, body : ?Text, paid : Bool) : async Text {
    let headers : [Header] = if (paid) {
      let key = switch (Prim.envVar<system>("ANTHROPIC_API_KEY")) { case (?value) value; case null throw Error.reject("AI is not configured") };
      [{name="Content-Type";value="application/json"},{name="anthropic-version";value="2023-06-01"},{name="x-api-key";value=key}];
    } else [{name="Accept";value="application/json"}];
    let bytes = switch (body) { case (?t) ?t.encodeUtf8(); case null null };
    // A paid request must run once, not once per replica.
    let response = await (with cycles = 30_000_000_000) management.http_request({ url; method; headers; body = bytes; max_response_bytes = ?131072; transform = null; is_replicated = ?false });
    if (response.status < 200 or response.status >= 300) throw Error.reject("Dictionary or AI service unavailable");
    switch (response.body.decodeUtf8()) { case (?t) t; case null throw Error.reject("Invalid service response") };
  };
};
