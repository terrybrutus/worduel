module {
  public type Meaning = { definition : Text; example : Text; source : Text; sourceUrl : Text; aiEnhanced : Bool; originalDefinition : Text };
  public type Alternative = { word : Text; definition : Text };
  public type Sentence = { text : Text; alternatives : [Alternative] };
  public type Quiz = { word : Text; savedDefinition : Text; alternatives : [Alternative]; sentence : ?Sentence; aiGenerated : Bool; source : Text; sourceUrl : Text };
};
