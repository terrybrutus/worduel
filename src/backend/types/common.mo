module {
  // Scalar identity types — used across all domains
  public type GameId      = Text;
  public type PlayerName  = Text;
  public type RoomCode    = Text;
  public type Passcode    = Text;
  public type Timestamp   = Int;   // nanoseconds via Time.now()
  public type SessionToken = Text; // opaque auth token
  public type JoinToken   = Text;  // one-time-use invite token (8-char hex)
};
