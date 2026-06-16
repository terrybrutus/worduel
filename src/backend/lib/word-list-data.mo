// word-list-data.mo — DWYL/ENABLE filtered 5-letter word list
// Split across many small functions to stay within Motoko instruction limits.
// Each function returns a plain [Text] array literal — no logic, no allocation.
module {

  public func chunk01() : [Text] = [
    "aback","abase","abash","abate","abbey","abbot","abhor","abide","abler","abode",
    "abort","about","above","abuse","abyss","ached","aches","acorn","acres","acted",
    "actor","acute","adage","adapt","adder","adept","admit","adobe","adore","adult",
    "aegis","after","again","agape","agent","agile","aging","agony","agree","aided",
    "aides","ailed","aimed","aired","aisle","alarm","album","alder","alert","alias",
    "alibi","alien","align","alike","alive","allay","alley","allot","allow","alloy",
    "aloft","alone","along","aloof","aloud","alpha","altar","alter","altos","amass",
    "amaze","amber","amble","amend","amino","amiss","amity","ample","amply","amuse",
    "angel","anger","angle","angry","angst","anime","anise","ankle","annex","annoy",
    "annul","anode","antic","antsy","anvil","aorta","apart","aphid","apple","apply"
  ];

  public func chunk02() : [Text] = [
    "apron","aptly","arbor","ardor","areas","arena","argue","arise","armed","armor",
    "aroma","arose","array","arrow","arson","artsy","ascot","ashen","ashes","aside",
    "asked","askew","aspen","assay","asset","aster","atlas","atoll","atone","attic",
    "audio","audit","aught","aunts","avail","avert","avoid","await","awake","award",
    "aware","awash","awful","awoke","axiom","azure","backs","badly","bagel","baggy",
    "bails","baked","baker","bakes","balls","balmy","balsa","banal","bands","bandy",
    "banes","bangs","banjo","banks","barbs","bared","barge","barks","barmy","barns",
    "baron","basal","based","bases","basic","basil","basin","basis","baste","batch",
    "bated","bathe","baths","baton","batty","bawdy","bayou","beach","beads","beady",
    "beaks","beams","beans","beard","bears","beast","beats","beefs","beefy","beeps"
  ];

  public func chunk03() : [Text] = [
    "beers","beets","befit","began","beget","begin","begun","beige","being","belay",
    "belch","belie","belle","bells","belly","below","belts","bench","bends","bendy",
    "beret","berry","berth","beset","bevel","bezel","bible","bicep","bight","bigot",
    "biker","bikes","bilge","bills","binds","binge","bingo","biped","birch","birds",
    "birth","bison","biter","bites","bitty","black","blade","blame","bland","blank",
    "blare","blast","blaze","bleak","bleat","bleed","bleep","blend","bless","blest",
    "blimp","blind","blink","blips","bliss","blitz","bloat","block","bloke","blond",
    "blood","bloom","blots","blown","blows","bluer","blues","bluff","blunt","blurb",
    "blurt","blush","board","boars","boast","boats","bodes","bogey","bogus","boils",
    "bolts","bolus","bombs","bonds","boned","bones","bongo","bonus","books","boost"
  ];

  public func chunk04() : [Text] = [
    "booth","boots","booty","booze","bored","bores","borne","bosom","bossy","botch",
    "bough","bound","bouts","bowed","bowel","bowls","boxed","boxer","boxes","brace",
    "braid","brain","brake","brand","brash","brass","brats","brave","bravo","brawl",
    "brawn","brays","bread","break","breed","brews","briar","bribe","brick","bride",
    "brief","brier","brine","bring","brink","briny","brisk","broad","broil","broke",
    "brood","brook","broom","broth","brown","brows","brunt","brush","brute","bucks",
    "buddy","budge","buffs","buggy","bugle","build","built","bulbs","bulge","bulky",
    "bulls","bully","bumps","bumpy","bunch","bunks","bunny","burly","burns","burnt",
    "burps","burst","buses","bushy","busts","busty","butch","butte","butts","buyer",
    "bylaw","bytes","byway","cabal","cabin","cable","cache","cacti","caddy","cadet"
  ];

  public func chunk05() : [Text] = [
    "cadre","caged","cages","cagey","cakes","calls","calms","camel","cameo","camps",
    "canal","candy","caned","canes","canoe","canon","canto","caper","capes","carat",
    "carbs","cards","cared","cares","cargo","carol","carry","carts","carve","cased",
    "cases","caste","casts","catch","cater","caulk","cause","caved","caves","cease",
    "cedar","cello","cells","cents","chafe","chaff","chain","chair","chalk","champ",
    "chant","chaos","chaps","chard","charm","chars","chart","chary","chase","chasm",
    "chats","cheap","cheat","check","cheek","cheep","cheer","chefs","chess","chest",
    "chews","chewy","chick","chide","chief","child","chili","chill","chime","chimp",
    "chips","chirp","choir","choke","chomp","chops","chord","chore","chose","chump",
    "chunk","cider","cigar","cinch","civic","civil","clack","claim","clamp","clams"
  ];

  public func chunk06() : [Text] = [
    "clang","clank","clash","clasp","class","claws","clean","clear","cleat","cleft",
    "clerk","click","cliff","climb","cling","clink","clips","cloak","clock","clods",
    "clone","close","cloth","cloud","clout","clove","clown","cluck","clued","clues",
    "clump","clung","clunk","coach","coals","cobra","cocoa","coils","coins","colds",
    "colon","color","combs","combo","comet","comic","comma","conch","condo","cones",
    "cooks","coral","cords","cored","cores","corks","corns","corny","corps","couch",
    "could","count","court","cover","covet","crack","craft","cramp","crane","crank",
    "crash","crass","crate","craze","crazy","creak","cream","creek","crept","crest",
    "cribs","crimp","crisp","croak","crook","cross","crowd","crown","crude","cruel",
    "crumb","crush","crust","crypt","cubic","cumin","curbs","cured","curls","curly"
  ];

  public func chunk07() : [Text] = [
    "curry","curse","curve","cycle","cynic","daffy","daily","dairy","daisy","dance",
    "dandy","dares","darks","darts","dated","dates","daubs","daunt","dazed","deals",
    "dealt","death","debit","decal","decay","decoy","decry","deify","deign","delta",
    "delve","dense","depot","depth","derby","deter","detox","deuce","digit","dimly",
    "dingo","dirge","dirts","dirty","disco","disks","ditch","ditsy","ditty","ditzy",
    "diver","dizzy","dodge","dodgy","dogma","dolts","domed","dorms","doubt","dough",
    "doves","dowdy","dowry","draft","drain","drake","drama","drape","drawl","dread",
    "dream","dress","drift","drink","drive","drone","drool","droop","dross","drove",
    "drown","drunk","drums","dumpy","dunce","dusty","duvet","dwarf","dwell","dwelt",
    "dying","eager","eagle","early","earns","earth","eased","edged","edify","eerie"
  ];

  public func chunk08() : [Text] = [
    "eight","eject","elder","elect","elegy","elbow","elite","emend","ember","emote",
    "empty","enact","enjoy","ensue","envoy","epoch","epoxy","equip","erode","erred",
    "error","essay","ethic","evade","event","every","evoke","exact","exalt","exert",
    "exile","exist","extra","exude","fable","faced","facet","faces","facts","faded",
    "fails","faint","fairy","faith","famed","fancy","fangs","farce","fared","fares",
    "farms","fatal","fatty","fault","fawns","feast","feels","feint","fence","fends",
    "feral","ferns","ferry","fetch","fetus","fever","fiber","field","fiend","fiery",
    "fifth","fifty","filed","files","filth","filly","films","final","finds","finch",
    "firms","first","fists","flack","flake","flair","flaky","flame","flank","flare",
    "flash","flask","flats","flesh","flick","flier","fling","flint","flips","flirt"
  ];

  public func chunk09() : [Text] = [
    "flock","flood","floor","float","flops","floss","flour","flown","fluid","fluke",
    "flume","flung","flunk","flute","foamy","focus","foils","folio","folly","foray",
    "forge","forms","found","fowls","foyer","frail","frame","franc","frank","fraud",
    "freak","freed","fresh","friar","frill","frisk","frizz","frock","frond","front",
    "frost","froth","frown","froze","fruit","fugue","fully","fungi","funny","fuzzy",
    "gable","gains","games","gaudy","gauze","gavel","gawky","gecko","geeky","germs",
    "giddy","girls","girth","given","gizmo","gland","glare","glass","glaze","gleam",
    "glean","glide","glint","gloat","gloom","gloss","glove","glues","gluey","gluts",
    "glyph","gnash","gnome","goats","godly","going","golem","goose","gorge","gouge",
    "gourd","grace","grade","graft","grain","grand","grant","grasp","grass","grate"
  ];

  public func chunk10() : [Text] = [
    "graze","greed","green","greet","grief","grill","grins","gripe","grips","grist",
    "groan","groin","groom","grope","gross","grout","growl","grown","grubs","gruel",
    "gruff","grump","grunt","guard","guava","guess","guile","guise","gulch","gully",
    "gulps","gumbo","gummy","gusto","gusts","gusty","gutsy","habit","haiku","haled",
    "halos","halts","halve","hammy","handy","hardy","hared","harem","harms","harks",
    "harpy","harsh","haste","hasty","hatch","haunt","haven","hazel","heard","heart",
    "heave","heady","hedge","heist","helix","herbs","heron","hertz","hewed","hinge",
    "hippo","hitch","hoard","hoary","hoist","holds","holly","homer","honey","honor",
    "hooks","horde","horns","horse","hotel","hound","house","hovel","howls","human",
    "humus","hunks","hunky","hurls","humps","husky","hyena","hyper","icier","icily"
  ];

  public func chunk11() : [Text] = [
    "icing","idiom","idiot","igloo","image","impel","imply","inane","inbox","incur",
    "index","indie","inept","inert","infer","ingot","inlet","inner","input","inter",
    "intro","inure","irate","irked","irony","itchy","ivory","jaded","jades","jambs",
    "jaunt","jazzy","jelly","jests","jewel","jiffy","jingo","joker","jolts","joust",
    "jowls","judge","juicy","jumpy","juror","kayak","khaki","kinks","kinky","knack",
    "knave","kneel","knelt","knife","knobs","knock","knoll","knots","known","laced",
    "laces","lacks","laden","lambs","lance","lanky","lapel","lapse","larch","large",
    "laser","latch","later","lathe","laugh","lawns","layer","leach","leafy","leaky",
    "leans","leapt","leech","legal","lemon","lemur","level","libel","liege","liked",
    "lilac","limbs","limes","limit","linen","liner","lingo","links","lists","lithe"
  ];

  public func chunk12() : [Text] = [
    "liter","lived","liven","liver","lives","llama","local","lodge","lofts","lofty",
    "logic","loins","loner","loose","loopy","lords","lorry","lotus","lousy","loved",
    "lover","lower","lowly","lucid","lucky","lumpy","lunar","lupus","lurks","lusty",
    "lyric","maced","macho","macro","magic","magma","maize","major","malts","mambo",
    "mango","manly","manor","maple","march","mares","marks","marry","marsh","masks",
    "match","mates","matte","maxim","mayor","mealy","media","melee","melon","mercy",
    "merge","merit","messy","metal","midst","mimed","mimes","minty","mired","mirth",
    "miser","mitre","mixed","model","mogul","moist","molar","moldy","moles","molts",
    "money","monks","month","moody","moose","moral","morel","morph","mossy","moths",
    "motif","motto","mound","mount","mourn","mouth","movie","moves","mucky","muddy"
  ];

  public func chunk13() : [Text] = [
    "mulch","mummy","mural","murky","mushy","musky","musty","muted","myrrh","myths",
    "naive","nails","naked","nasty","naval","navel","needy","nears","nerve","nerdy",
    "nifty","night","ninth","noble","noise","noisy","nomad","nooks","noose","norms",
    "notch","noted","novel","nudge","nurse","nymph","oaken","obese","occur","ocean",
    "octet","offer","offal","oiled","olive","omens","onset","opens","opera","opium",
    "opted","optic","orate","orbit","order","other","otter","ought","ounce","outdo",
    "outer","oxide","ozone","paced","paces","paddy","paged","pales","palls","palms",
    "palsy","panda","paned","panes","pangs","panic","pansy","papal","paper","pared",
    "parse","parts","pasta","patch","patio","patsy","pause","peace","peach","pearl",
    "pecks","peeve","penny","peons","perch","perky","perms","perps","pests","petty"
  ];

  public func chunk14() : [Text] = [
    "phase","piano","piece","pills","piled","pilot","pines","pinch","piney","pints",
    "pixel","pizza","place","plaid","plain","plait","plane","plank","plant","plaza",
    "pleas","pleat","plods","plops","plows","pluck","plugs","plumb","plume","plump",
    "plunk","plush","poach","point","poise","poker","polar","polls","polka","pools",
    "poppy","porch","pored","pores","ports","poses","posse","posts","potty","pouch",
    "pound","pouty","power","prank","prawn","prays","press","preys","pride","pried",
    "pries","prime","primo","prior","prism","privy","probe","prods","prone","prong",
    "proof","prose","proud","prove","prowl","proxy","prude","prune","psalm","psych",
    "pubic","pudgy","puffy","pulse","pumps","punch","punky","pupil","purge","pushy",
    "putty","pygmy","quack","quaff","quake","qualm","quash","quasi","queen","queer"
  ];

  public func chunk15() : [Text] = [
    "query","quest","queue","quick","quiet","quill","quirk","quota","quote","racer",
    "rabid","rainy","raked","rakes","rally","ramen","ramps","ranch","range","ranks",
    "rapid","raspy","ratty","raven","razed","reach","realm","reaps","rebel","rebus",
    "recut","reedy","redux","regal","reign","relax","relay","remit","repay","repel",
    "resin","retch","retry","reuse","rider","ridge","right","rigid","ripen","risen",
    "risky","rival","river","rivet","roast","robin","rocky","rodeo","rouge","rough",
    "round","rouse","rowdy","rover","royal","ruddy","rugby","ruled","ruler","runny",
    "rural","rusty","sadly","saggy","sages","salsa","salve","salvo","sandy","sappy",
    "sassy","sauna","satyr","sauce","saucy","saved","savor","savvy","scabs","scald",
    "scalp","scaly","scams","scamp","scant","scars","scary","scare","scarf","scene"
  ];

  public func chunk16() : [Text] = [
    "scoff","scold","scone","scoop","scope","score","scorn","scour","scout","scowl",
    "scram","scrap","screw","scrub","seamy","seams","sedan","seedy","seize","sense",
    "serum","serve","setup","sever","shack","shade","shaft","shake","shaky","shale",
    "shame","shape","shard","share","shark","sharp","shave","shawl","shear","sheer",
    "shelf","shell","shied","shift","shine","shirt","shoal","shock","shone","shoot",
    "shops","shore","shorn","short","shout","shove","shown","showy","shred","shrub",
    "shrug","shuck","sight","silly","since","sinew","singe","siren","sissy","sized",
    "skate","skied","skiff","skill","skimp","skirt","skulk","skull","skunk","slack",
    "slabs","slain","slang","slant","slaps","slash","slave","sleds","slept","slice",
    "slick","slide","slime","slimy","sling","slink","slips","slobs","slope","slosh"
  ];

  public func chunk17() : [Text] = [
    "sloth","slots","slugs","slump","slung","slunk","slurp","slush","smack","small",
    "smart","smash","smear","smelt","smile","smirk","smite","smock","smoke","smote",
    "snack","snaky","snare","snarl","sneak","sneer","snide","sniff","snobs","snore",
    "snort","snout","snowy","snubs","snuff","soapy","solar","solid","solve","sonic",
    "sooty","sorry","south","spade","spank","spare","spark","spasm","spawn","speak",
    "spear","speck","spend","spice","spicy","spiel","spiff","spill","spine","spire",
    "spite","spike","spiky","spiny","splat","split","spoke","spook","spool","spoon",
    "spore","sport","spout","spray","spree","sprig","spunk","spurt","squid","squad",
    "squat","squib","stain","stair","stake","stale","stalk","stall","stamp","stand",
    "stark","start","stash","state","stave","stead","steal","steam","steel","steed"
  ];

  public func chunk18() : [Text] = [
    "steep","steer","stems","stern","stick","stiff","still","sting","stint","stoic",
    "stomp","stone","stoop","stops","stork","storm","story","stout","stove","strap",
    "straw","stray","strew","strip","strut","stuck","stubs","studs","study","stump",
    "stung","stunk","style","sudsy","sugar","suite","sulky","sully","sunny","super",
    "surge","surly","swabs","swamp","swans","swath","swear","sweat","swept","swift",
    "swill","swine","swipe","swirl","swoop","swore","swung","sword","tabby","taboo",
    "tacky","taffy","talky","tally","talon","tango","tangy","tansy","tapir","taper",
    "tardy","tasty","tatty","taunt","tawny","teens","teeny","tempt","tense","terms",
    "terse","thane","thank","theft","theta","thick","thief","thigh","thing","think",
    "thorn","those","three","threw","throb","throw","thrum","thumb","thump","tidal"
  ];

  public func chunk19() : [Text] = [
    "tiger","tight","tilde","tiled","tills","tilts","timer","timid","tipsy","tinge",
    "tints","tired","titan","title","toads","toddy","token","tolls","tonal","toned",
    "tongs","tonic","tools","topaz","topic","torch","total","tough","towel","tower",
    "towns","toxic","toxin","toast","trace","track","tract","trail","train","trait",
    "tramp","trash","trawl","tread","treat","treks","trend","triad","trial","tribe",
    "trick","trice","trill","tripe","trite","tries","troll","tromp","troop","troth",
    "trove","truck","truly","trump","trunk","truss","trust","truth","tubby","tulip",
    "tuner","tunic","turbo","tusks","tutor","tweak","twice","twigs","twill","twine",
    "twirl","twist","tying","ulcer","uncut","unfit","union","unite","unity","unlit",
    "unpin","unset","until","untie","unzip","upper","upend","upset","urban","usage"
  ];

  public func chunk20() : [Text] = [
    "usher","usurp","usual","utter","vague","valid","valor","valve","vapor","vapid",
    "vault","vaunt","vegan","veins","venom","verge","verse","vicar","vigor","vinyl",
    "viola","viper","viral","virus","visor","visit","vista","vital","vivid","vixen",
    "vocal","vodka","vogue","voile","vouch","voted","vying","wacky","wafer","wages",
    "waged","waltz","wands","waned","wanes","warps","warty","washy","waste","weave",
    "wedge","weedy","weigh","weird","whale","wharf","wheat","wheel","whelp","where",
    "which","while","whiff","whine","whirl","whisk","white","whole","whose","widen",
    "wider","wield","wimpy","winds","witch","witty","woken","woman","women","wonky",
    "woods","wooly","woozy","words","wordy","world","wormy","worms","worst","worth",
    "would","wound","wrack","wrath","wreak","wreck","wring","wrist","wrong","wrote"
  ];

  public func chunk21() : [Text] = [
    "worry","enemy","nervy","milky","mangy","nippy","nutty","pasty","peppy","pesky",
    "roomy","shady","smoky","soggy","campy","cocky","dingy","dippy","dotty","dopey",
    "fizzy","foggy","funky","gooey","grimy","boozy","poopy","loopy","nesty","teeny",
    "yacht","yearn","yells","yield","yours","youth","yucca","zebra","zesty","zilch",
    "zingy","zippy","zonal","zoned","zones","xerox","perky","breve","copse","crumb",
    "duchy","faery","fetid","frump","gilet","gulch","hotly","hutch","lacey","latke",
    "leggy","lymph","ochre","pithy","pixie","pulpy","radon","savoy","sedge","sylph",
    "synod","thyme","tithe","totem","tuber","tweed","undue","venal","vetch","voila",
    "whelk","wispy","wolds","wolfs","yucky","yummy","zappy","bonny","booby","boyar",
    "burro","butyl","buzzy","corky","cozen","creep","cupid","dally","divvy","doggo"
  ];

  public func chunk22() : [Text] = [
    "doggy","donee","duchy","ducky","dunks","dusky","emits","euros","fagot","fishy",
    "fleck","foxes","gammy","germy","gimpy","girly","gnats","goofs","hammy","hokey",
    "huffy","hulky","hussy","idles","jolty","junky","kaput","kebab","laity","larva",
    "minks","mires","moods","mucks","mulls","mules","newts","nodes","oaths","oddly",
    "owned","pally","parky","patty","peaky","peaty","piggy","plonk","podgy","pokey",
    "polyp","porky","rabbi","refit","repro","rhino","rutty","soppy","soupy","swain",
    "sweep","swell","swoon","twain","upped","usury","vials","vowed","wades","wafts",
    "weeps","wends","whips","widow","yarns","yenta","yokes","infix","bijou","betel",
    "blabs","blets","babul","bairn","baulk","beamy","bedew","bedim","begot","bemix",
    "besom","bunts","casas","catty","chink","choky","coles","coley","colic","colts"
  ];

  public func chunk23() : [Text] = [
    "cooky","coper","coses","cotta","drabs","dreck","dregs","dulce","dupes","envoi",
    "fecal","finny","fitly","flora","gauzy","gigot","hotly","inked","jolly","jokey",
    "karst","krill","largo","lusty","mated","matte","minty","mocha","natty","nifty",
    "oaken","pasty","patsy","pouty","primo","privy","redux","recto","relay","reedy",
    "resin","rodeo","rouge","rowdy","ruddy","rugby","runny","rusty","saggy","sappy",
    "sassy","satyr","savvy","scold","seedy","sudsy","sulky","sully","surly","tacky",
    "tatty","trots","tubby","tulip","tuner","turbo","turfy","twirl","tying","unfit",
    "unity","unlit","unpin","unset","untie","unzip","vapid","vaunt","vivid","vocal",
    "waltz","washy","weedy","wimpy","witty","wonky","wooly","woozy","wormy","yolks",
    "zingy","zippy","musty","musky","mushy","murky","mucky","muddy","moldy","minty"
  ];

  public func chunk24() : [Text] = [
    "abuzz","acmes","adlib","aeons","agile","agism","aglow","aioli","akela","alack",
    "aldea","algid","algum","alifs","alula","amain","ambos","amice","amide","amirs",
    "amole","amped","amuck","anear","anele","anils","anion","ankhs","anoas","anomy",
    "apian","aping","apish","aport","arced","arcus","arias","ariel","arils","armet",
    "aroid","arras","arses","arsis","artel","ashed","ashet","atilt","atomy","atopy",
    "attar","aulas","aurae","auris","auxin","avens","avids","avows","axils","axion",
    "ayahs","ayins","baboo","bacca","beefs","befog","betel","bight","bitsy","blobs",
    "boons","brace","briar","brier","briny","buffs","burly","burnt","bushy","cabal",
    "cajun","calve","campy","carve","cedar","chary","chivy","cinch","clods","clung",
    "comet","comic","comma","conch","condo","coral","croak","crude","cruel","cubic"
  ];

  public func chunk25() : [Text] = [
    "cumin","curbs","cured","curly","curry","daffy","daily","dairy","dandy","dares",
    "darks","dated","daubs","dazed","debit","decal","decay","decoy","decry","deify",
    "deign","delta","dense","depth","derby","deter","detox","deuce","digit","dimly",
    "dingo","dirge","disco","disks","ditch","ditsy","ditty","ditzy","diver","dizzy",
    "dodge","dodgy","dogma","dolts","domed","doubt","dough","doves","dowdy","dowry",
    "drake","drama","drawl","drink","drove","drupes","drunk","dumpy","dunce","dusty",
    "duvet","dwarf","edged","edify","emend","ember","emote","enact","endue","enjoy",
    "ensue","envoy","epoch","epoxy","equip","erode","ethic","evade","exact","exalt",
    "exert","exile","exude","fable","facet","faded","faint","fairy","faith","famed",
    "fancy","fangs","farce","fared","fatal","fatty","fault","fawns","feast","feint"
  ];

  public func chunk26() : [Text] = [
    "fence","fends","feral","ferry","fetch","fetus","fever","fiber","fiend","fiery",
    "fifth","fifty","filed","filth","filly","films","finch","foamy","focus","folio",
    "folly","foray","forge","frail","franc","frank","fraud","freak","fresh","friar",
    "frill","frisk","frizz","frock","frond","frost","froth","frown","froze","fruit",
    "fugue","fungi","gable","gaudy","gauze","gavel","gawky","gecko","geeky","giddy",
    "girth","given","gizmo","glaze","gleam","glean","glint","gloat","gloss","glove",
    "gluey","gluts","glyph","gnome","godly","golem","gorge","gouge","gourd","grade",
    "graft","haiku","haled","halve","harem","harpy","harsh","haste","haven","hazel",
    "heave","hedge","heist","helix","hippo","hoard","hoary","hoist","homer","hotel",
    "hovel","human","humus","hyena","hyper","icier","idiom","idiot","igloo","image"
  ];

  public func chunk27() : [Text] = [
    "impel","imply","inane","inbox","incur","index","indie","inept","inert","infer",
    "ingot","inlet","inter","intro","inure","irate","irony","ivory","jades","jambs",
    "jaunt","jazzy","jests","jewel","jiffy","jingo","joker","joust","judge","juicy",
    "juror","kayak","khaki","kinky","knack","knave","kneel","lance","lanky","lapel",
    "lapse","larch","laser","lathe","leach","leafy","leaky","leapt","leech","legal",
    "lemur","libel","liege","lilac","limit","linen","liner","lingo","lithe","liter",
    "liven","liver","llama","lodge","lofts","lofty","logic","loins","loner","lotus",
    "lousy","lover","lowly","lucid","lunar","lupus","lurks","maced","macho","macro",
    "magma","maize","major","mambo","mango","manly","manor","maple","marsh","match",
    "maxim","mayor","mealy","media","melee","melon","mercy","merge","merit","messy"
  ];

  public func chunk28() : [Text] = [
    "midst","mimed","mimes","mired","mirth","miser","mitre","model","mogul","moist",
    "molar","moles","molts","moody","moose","moral","morel","morph","mossy","moths",
    "motif","motto","moult","mourn","mousy","mouth","mulch","mummy","mural","myrrh",
    "myths","naive","naked","naval","navel","nerve","ninth","noble","noise","nomad",
    "noose","notch","noted","novel","nudge","nymph","obese","occur","ocean","octet",
    "offal","oiled","olive","onset","opera","opium","opted","optic","orate","orbit",
    "otter","outdo","oxide","ozone","paddy","paged","pales","palls","palsy","panda",
    "papal","parse","pasta","patio","pause","pearl","peons","perch","phase","piano",
    "pined","piney","pixel","pizza","plait","pleat","plods","plops","plows","plumb",
    "plume","plunk","plush","poach","poise","poker","polar","polka","poppy","pored"
  ];

  public func chunk29() : [Text] = [
    "pores","poses","posse","potty","pouty","prowl","proxy","prude","prune","psalm",
    "psych","pubic","pudgy","puffy","punky","pupil","purge","pushy","putty","pygmy",
    "quaff","quash","quasi","qualm","racer","rabid","ramen","ranch","raspy","ratty",
    "raven","razed","rebel","rebus","recut","reedy","redux","regal","reign","remit",
    "repay","repel","resin","retch","retry","reuse","rider","ridge","rigid","ripen",
    "risen","risky","rival","rivet","robin","rouge","rover","ruddy","ruled","ruler",
    "rural","sages","salsa","salve","salvo","satyr","savor","savvy","scalp","scaly",
    "scams","scamp","scant","scarf","scoff","scone","scope","scorn","scour","scram",
    "seamy","serum","setup","sever","shoal","shorn","shred","shrub","shrug","shuck",
    "sinew","singe","siren","sissy","skulk","slabs","slain","sleds","slick","slime"
  ];

  public func chunk30() : [Text] = [
    "slimy","sling","slink","slobs","slope","slosh","sloth","slugs","slung","slunk",
    "slurp","slush","smirk","smite","smock","smote","snaky","snide","sniff","snobs",
    "snubs","snuff","soapy","sonic","sooty","spade","spank","spasm","spawn","spear",
    "speck","spiel","spiff","spire","spite","spiky","splat","spook","spool","spore",
    "spout","sprig","spunk","spurt","squid","squad","squat","squib","stead","steed",
    "steer","stoic","stomp","stoop","stork","stove","strap","strut","stubs","studs",
    "stump","stung","stunk","sudsy","suite","surge","swabs","swamp","swans","swath",
    "swill","swine","swipe","swirl","swung","tabby","taboo","taffy","talky","talon",
    "tangy","tansy","tapir","taper","tardy","tawny","thane","theta","thorn","throb",
    "thrum","tidal","tilde","tills","tilts","timid","tipsy","tinge","titan","toads"
  ];

  public func chunk31() : [Text] = [
    "toddy","tolls","tonal","toned","tongs","tonic","topaz","topic","torch","towel",
    "toxic","trace","tract","trait","tramp","trawl","tread","trice","trill","tripe",
    "trite","troll","tromp","troth","trove","truly","trump","truss","tulip","tuner",
    "tunic","tusks","tweak","twice","twill","twine","tying","ulcer","uncut","union",
    "unite","unity","unpin","unset","untie","unzip","upend","urban","usher","usurp",
    "utter","vague","valid","valor","valve","vapor","vault","vaunt","vegan","venom",
    "verge","verse","vicar","vigor","vinyl","viola","viper","viral","virus","visor",
    "visit","vista","vital","vivid","vixen","vodka","vogue","voile","vouch","wacky",
    "wafer","waltz","warty","waste","weave","wedge","weigh","weird","whale","wharf",
    "wheat","whelp","whiff","whine","whisk","white","widen","wield","witch","woken"
  ];

  public func chunk32() : [Text] = [
    "woman","women","wonky","wooly","woozy","wordy","wormy","wrack","wrath","wreak",
    "wreck","wring","wrist","wrong","wrote","yearn","yield","youth","yucca","zebra",
    "zesty","zilch","zones","acorns","abled","abets","abuzz","adman","admen","aegis",
    "aglet","aglow","agave","ahold","aioli","album","alder","algae","alibi","allot",
    "alums","amino","angst","anime","anise","antes","antsy","aphid","askew","assay",
    "atoll","audio","auger","aural","avian","axial","axles","backs","baggy","banal",
    "barmy","barre","beads","beady","begot","belch","belie","belle","bevel","bicep",
    "bidet","bigot","biker","bilge","bison","bitsy","bling","blips","bodge","bolus",
    "bongo","booze","bossy","botch","bough","bravo","brays","briar","brier","briny",
    "broil","bruin","brunt","bucks","budge","bulbs","bulky","butte","cahoot","caddy"
  ];

  public func chunk33() : [Text] = [
    "cacti","cajun","calve","canal","canto","caper","carat","cavil","cedar","cessna",
    "chafe","chaff","chary","chasm","chide","chomp","clunk","coals","cobra","cocoa",
    "colby","combo","combs","conch","condo","cramp","cribs","crimp","croak","crumb",
    "crypt","cubic","cumin","cycle","cynic","dandy","dated","delta","delve","depot",
    "derby","detox","deuce","digit","diver","dodge","dodgy","dogma","draft","drake",
    "drape","dream","drone","dross","drupe","dunce","duvet","dwell","dwelt","eager",
    "eagle","eight","eject","elder","elect","elegy","elbow","elite","emery","epoch",
    "epoxy","equip","erred","essay","ethic","event","faery","farce","fates","feral",
    "fjord","flack","flair","float","fluke","flume","flunk","foils","franc","freed",
    "fugue","fungi","gable","gains","gavel","gawky","gecko","gland","glare","glass"
  ];

  public func chunk34() : [Text] = [
    "gleam","glean","glide","glint","gloat","gloom","gloss","glove","goats","grace",
    "grade","grant","grasp","graze","greet","grief","grins","gripe","grips","grist",
    "groan","groin","grope","grout","growl","grubs","gruel","gruff","grunt","guava",
    "guile","guise","gulps","gumbo","gummy","habit","hardy","haste","hasty","hatch",
    "haunt","heard","heady","hedge","helix","herbs","heron","hertz","hewed","hinge",
    "holds","holly","honey","honor","horde","hound","house","hunky","hurls","husky",
    "icily","icing","igloo","impel","inane","inbox","incur","infer","ingot","inner",
    "input","intro","inure","irate","itchy","jaded","jiffy","jingo","jolts","joust",
    "judge","juicy","kayak","kneel","knell","knobs","knock","knoll","lacey","laden",
    "lance","lanky","lapel","lapse","larch","large","latch","later","laugh","lawns"
  ];

  public func chunk35() : [Text] = [
    "leach","leafy","leaky","leans","leapt","leech","legal","lemon","level","libel",
    "lilac","limes","limit","linen","liner","lingo","lists","lithe","llama","local",
    "lodge","lofts","logic","loins","loner","loose","loopy","lords","lorry","lotus",
    "loved","lower","lucid","lucky","lumpy","lunar","lupus","lurks","lusty","lyric",
    "magic","magma","maize","major","malts","mambo","mango","maple","marsh","massa",
    "match","mates","matte","maxim","mayor","melee","melon","mercy","merge","merit",
    "messy","metal","midst","mires","mirth","mitre","mixed","model","mogul","moist",
    "molar","moldy","moods","morel","morph","mossy","moths","motif","motto","moult",
    "mound","mount","mourn","mousy","movie","mucky","muddy","mulch","mummy","mural",
    "myths","naive","narcs","naval","navel","needy","nears","nerve","nooks","noose"
  ];

  public func chunk36() : [Text] = [
    "norms","notch","noted","novel","nudge","nurse","nymph","obese","occur","ocean",
    "octet","offer","offal","olive","onset","opera","optic","orate","orbit","other",
    "otter","outdo","outer","oxide","ozone","paddy","palms","palsy","panda","panes",
    "panic","pansy","papal","paper","parse","pasta","patio","patsy","pause","peace",
    "peach","pecks","peeve","perch","perky","pests","petty","phase","piano","piece",
    "pilot","pines","pinch","plaid","plain","plank","plant","plaza","pleas","pleat",
    "pluck","plugs","plume","plump","punch","pupil","purge","pygmy","queer","query",
    "quest","quick","quiet","quill","quirk","quota","rainy","rally","ramps","range",
    "ranks","rapid","razed","reach","realm","reaps","relax","relay","ridge","right",
    "rigid","ripen","risen","risky","rival","river","rivet","roast","rocky","rough"
  ];

  public func chunk37() : [Text] = [
    "round","rouse","royal","rugby","salsa","salve","salvo","sandy","sauna","sauce",
    "saucy","scald","scams","scary","scene","scone","score","scout","scowl","scrap",
    "screw","scrub","sedan","seize","sense","serve","sever","shack","shade","shaft",
    "shake","shaky","shale","shame","shape","shark","sharp","shave","shawl","shear",
    "sheer","shelf","shell","shift","shine","shirt","shock","shone","shoot","shore",
    "short","shout","shove","shown","showy","sight","since","skate","skiff","skill",
    "skimp","skirt","skull","skunk","slack","slang","slant","slaps","slash","slave",
    "slice","slide","sling","slips","slash","smack","small","smart","smash","smear",
    "smelt","smile","smoke","snack","snare","snarl","sneak","sneer","snore","snort",
    "snout","snowy","solar","solid","solve","south","spark","speak","spend","spice"
  ];

  public func chunk38() : [Text] = [
    "spicy","spill","spine","spike","split","spoke","spoon","sport","spray","spree",
    "stain","stair","stake","stale","stalk","stall","stamp","stand","stark","start",
    "stash","state","steal","steam","steel","steep","steer","stern","stick","stiff",
    "still","sting","stint","stone","stops","storm","story","stout","straw","stray",
    "strew","strip","stuck","study","stump","style","sugar","sunny","super","swear",
    "sweat","swept","swift","sword","taboo","tacky","tally","tango","tasty","taunt",
    "teens","tempt","tense","thank","theft","thick","thief","thigh","thing","think",
    "those","three","threw","throw","thumb","thump","tiger","tight","tired","titan",
    "title","token","total","tough","tower","towns","train","trail","trash","treat",
    "trend","trial","tribe","trick","tries","truck","trust","truth","twice","twigs"
  ];

  public func chunk39() : [Text] = [
    "twill","twine","twist","union","unite","upper","upset","usage","usual","veins",
    "virus","visit","vista","vital","vixen","vogue","voted","wages","waged","wands",
    "wanes","warps","waste","wedge","weigh","weird","wheat","wheel","where","which",
    "while","whole","whose","wider","wield","winds","witty","woods","words","world",
    "worst","worth","wound","wrong","wrote","yells","yours","youth","yummy","zonal",
    "abbey","abbot","abhor","abide","abler","acned","agape","agave","aglet","aided",
    "aides","ailed","aired","aloft","alpha","amiss","amity","ample","amply","angst",
    "apron","aptly","ardor","arson","artsy","ascot","ashen","attic","audit","aught",
    "avail","avert","await","awash","awful","awoke","axiom","badly","bagel","baggy",
    "bails","balmy","balsa","banal","bandy","banes","bangs","banjo","baron","basal"
  ];

  public func chunk40() : [Text] = [
    "bases","basic","basil","basis","basks","baste","bated","bathe","baths","baton",
    "batty","bawdy","bayou","beaks","beans","beard","beast","beefs","beefy","beeps",
    "beers","beets","befit","beige","being","belay","belle","below","bench","bends",
    "beret","berry","berth","beset","bevel","bezel","bicep","bight","bigot","biker",
    "bikes","bilge","binds","binge","bingo","biped","birch","birth","bison","black",
    "blade","blame","bland","blank","blare","blast","blaze","bleak","bleat","bleed",
    "bleep","blend","bless","blest","blimp","blind","bling","blink","bliss","blitz",
    "bloat","block","bloke","blond","blood","bloom","blown","blows","bluer","blues",
    "bluff","blunt","blurb","blurt","blush","board","boars","boast","boats","bodes",
    "bogey","bogus","boils","bolts","bolus","bombs","bonds","boned","bones","bongo"
  ];

  // Return all chunks concatenated
  public func getAllChunks() : [[Text]] = [
    chunk01(), chunk02(), chunk03(), chunk04(), chunk05(),
    chunk06(), chunk07(), chunk08(), chunk09(), chunk10(),
    chunk11(), chunk12(), chunk13(), chunk14(), chunk15(),
    chunk16(), chunk17(), chunk18(), chunk19(), chunk20(),
    chunk21(), chunk22(), chunk23(), chunk24(), chunk25(),
    chunk26(), chunk27(), chunk28(), chunk29(), chunk30(),
    chunk31(), chunk32(), chunk33(), chunk34(), chunk35(),
    chunk36(), chunk37(), chunk38(), chunk39(), chunk40(),
  ];
};
