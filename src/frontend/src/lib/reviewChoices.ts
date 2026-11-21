interface Alternative { word: string; definition: string }
interface Challenge {
  sentence?: string;
  alternatives: [Alternative, Alternative];
}

// Related concepts, not synonyms. Contexts distinguish the intended saved sense.
export const reviewChoices: Record<string, Challenge> = {
  planet: { sentence: "Earth orbits the Sun as a _____, rather than orbiting another planet.", alternatives: [
    { word: "moon", definition: "A natural body that orbits a planet." },
    { word: "star", definition: "A huge ball of hot gas that produces its own light." }] },
  garden: { sentence: "The outdoor area behind her house, with a lawn and flowerbeds, was her _____.", alternatives: [
    { word: "orchard", definition: "An area of land planted mainly with fruit trees." },
    { word: "greenhouse", definition: "A building with transparent walls or a roof for growing plants." }] },
  brain: { sentence: "Inside the skull, the _____ processes information and forms memories.", alternatives: [
    { word: "spinal cord", definition: "The bundle of nerves in the spine carrying signals to and from the head." },
    { word: "heart", definition: "The muscular organ that pumps blood around the body." }] },
  library: { sentence: "I used my borrowing card to take novels home from the public _____.", alternatives: [
    { word: "bookshop", definition: "A shop where people buy books." },
    { word: "archive", definition: "A collection of historical records kept for preservation." }] },
  photosynthesis: { sentence: "Plants use light to turn water and carbon dioxide into sugars through _____.", alternatives: [
    { word: "respiration", definition: "The process cells use to release energy from food." },
    { word: "transpiration", definition: "The loss of water vapor from a plant, mainly through its leaves." }] },
  apple: { sentence: "Granny Smith and Fuji are varieties of _____.", alternatives: [
    { word: "pear", definition: "A sweet fruit often narrower at the stem and wider at the base." },
    { word: "peach", definition: "A soft fruit with fuzzy skin and a large hard stone inside." }] },
  bread: { sentence: "The baker used yeast to make the dough rise, then baked it into a loaf of _____.", alternatives: [
    { word: "pastry", definition: "A dough made with flour and fat, often used for pies or tarts." },
    { word: "pasta", definition: "Food made from dough and shaped into noodles or other forms, usually boiled." }] },
  chair: { sentence: "For one person, she chose a seat with a back, no long cushion and no armrests: a simple _____.", alternatives: [
    { word: "stool", definition: "A seat for one person without a back or armrests." },
    { word: "bench", definition: "A long seat made for more than one person." }] },
  crane: { sentence: "To raise a steel beam with a cable suspended from a long boom, the workers used a _____.", alternatives: [
    { word: "forklift", definition: "A vehicle that raises and carries loads on two projecting metal forks." },
    { word: "excavator", definition: "A machine with a large digging bucket for moving earth." }] },
  brave: { sentence: "She understood the danger and took care, but was _____ enough to act despite her fear.", alternatives: [
    { word: "reckless", definition: "Acting without enough concern for danger or the consequences." },
    { word: "fearless", definition: "Not feeling afraid, even in dangerous situations." }] },
  plant: { sentence: "The living thing grew green leaves and made its own food from light: it was a _____.", alternatives: [
    { word: "fungus", definition: "An organism such as a mushroom that absorbs nutrients instead of making food from light." },
    { word: "mineral", definition: "A naturally occurring solid substance that is not alive." }] },
  flame: { sentence: "Above the candle's wick, the visible burning gas formed a small _____.", alternatives: [
    { word: "ember", definition: "A piece of wood or coal that remains hot and glowing after a fire." },
    { word: "spark", definition: "A tiny burning particle or a brief flash of electrical light." }] },
  trust: { sentence: "Based on her long record of honesty, I _____ her to keep the promise she made.", alternatives: [
    { word: "suspect", definition: "To think something may be true without being certain, often about wrongdoing." },
    { word: "doubt", definition: "To feel uncertain about whether someone or something is reliable or true." }] },
  smart: { sentence: "She had not studied the topic, but solved the unfamiliar puzzle quickly, showing she was _____.", alternatives: [
    { word: "knowledgeable", definition: "Having a lot of information or experience about a subject." },
    { word: "studious", definition: "Spending a lot of time and effort studying." }] },
  quiet: { sentence: "It was not completely silent, but with very little noise the room was _____.", alternatives: [
    { word: "silent", definition: "Making no sound at all." },
    { word: "noisy", definition: "Making a lot of loud or unwanted sound." }] },
  light: { sentence: "Even a cold lamp can provide the _____ our eyes need to see a page.", alternatives: [
    { word: "heat", definition: "Energy transferred because of a difference in temperature." },
    { word: "shadow", definition: "A dark area made when something blocks illumination." }] },
  dream: { sentence: "While completely asleep, I experienced a vivid _____ about flying.", alternatives: [
    { word: "daydream", definition: "A pleasant imagined experience while a person is awake." },
    { word: "memory", definition: "Something remembered from an earlier experience." }] },
  pride: { sentence: "She felt _____ in the difficult project she herself had completed, without boasting about it.", alternatives: [
    { word: "arrogance", definition: "An exaggerated belief that one is more important or capable than other people." },
    { word: "envy", definition: "A wish to have another person's success, qualities or possessions." }] },
  prune: { sentence: "A plum that has been dried is sold as a _____.", alternatives: [
    { word: "raisin", definition: "A grape that has been dried." },
    { word: "date", definition: "The sweet fruit of a type of palm tree." }] },
  clean: { sentence: "The empty, messy desk was neither organized nor new, but after we wiped off all the dirt it was _____.", alternatives: [
    { word: "tidy", definition: "Neatly arranged and in good order." },
    { word: "sterile", definition: "Free from living microorganisms." }] },
  sound: { sentence: "Not just an echo or a human voice, anything our ears can hear is a _____.", alternatives: [
    { word: "echo", definition: "A reflected noise heard again after it reaches a surface." },
    { word: "voice", definition: "The noise a person produces when speaking or singing." }] },
  earth: { sentence: "The planet whose natural satellite is the Moon is _____.", alternatives: [
    { word: "Mars", definition: "The fourth planet from the Sun, often called the red planet." },
    { word: "Venus", definition: "The second planet from the Sun, with a thick atmosphere." }] },
  fresh: { sentence: "Baked only minutes ago rather than yesterday, the bread was _____.", alternatives: [
    { word: "stale", definition: "No longer new or pleasant because of age or exposure." },
    { word: "raw", definition: "Not yet cooked or processed." }] },
  infer: { sentence: "Without seeing the rain, we used the wet pavement as evidence to _____ that it had rained.", alternatives: [
    { word: "assume", definition: "To accept something as true without checking or having enough evidence." },
    { word: "observe", definition: "To notice or watch something directly." }] },
  mitigate: { sentence: "The barriers could not remove the danger entirely, but they helped _____ its severity.", alternatives: [
    { word: "eliminate", definition: "To remove or get rid of something completely." },
    { word: "aggravate", definition: "To make a problem, injury or situation worse." }] },
  resilient: { sentence: "The team was shaken by the setback but recovered quickly, showing it was _____.", alternatives: [
    { word: "invulnerable", definition: "Unable to be harmed or damaged." },
    { word: "rigid", definition: "Stiff or unwilling to bend or change." }] },
  stakeholder: { sentence: "Although she owned no shares, she was affected by the project's decision and was therefore a _____.", alternatives: [
    { word: "shareholder", definition: "A person or organization that owns shares in a company." },
    { word: "spectator", definition: "A person who watches an event without taking part." }] },
  bridge: { sentence: "To cross above the river rather than travel through it or beneath it, we used a _____.", alternatives: [
    { word: "ferry", definition: "A boat or ship that carries people or vehicles across water." },
    { word: "tunnel", definition: "A passage built beneath the ground or under an obstacle." }] },
  blanket: { sentence: "She spread a thick, loose bed covering over herself, without putting her arms into sleeves: a _____.", alternatives: [
    { word: "sheet", definition: "A large, thin piece of fabric used on a bed." },
    { word: "robe", definition: "A loose garment with sleeves worn around the body." }] },
  bicycle: { sentence: "She balanced on two wheels and pushed the pedals, riding a _____.", alternatives: [
    { word: "tricycle", definition: "A pedal-powered vehicle with three wheels." },
    { word: "motorcycle", definition: "A two-wheeled vehicle powered by an engine." }] },
  bottle: { sentence: "The narrow-necked container had a screw cap and no handle; he poured water from the _____.", alternatives: [
    { word: "jug", definition: "A container with a handle and a spout for pouring liquids." },
    { word: "jar", definition: "A wide-mouthed container, often with a lid, for storing food or other items." }] },
  orchard: { sentence: "Rows of apple and pear trees, rather than grapevines or grazing animals, filled the _____.", alternatives: [
    { word: "vineyard", definition: "Land planted with grapevines." },
    { word: "pasture", definition: "Grassy land where animals graze." }] },
  feather: { sentence: "The bird's wing was covered with overlapping structures, each with a central shaft: a _____.", alternatives: [
    { word: "scale", definition: "One of the small overlapping plates covering the skin of fish or reptiles." },
    { word: "fur", definition: "The thick coat of hair covering some mammals." }] },
  lantern: { sentence: "The portable light enclosed its flame behind glass, shielding it from wind: a _____.", alternatives: [
    { word: "torch", definition: "A burning stick carried as a light, or a handheld electric flashlight." },
    { word: "candle", definition: "A block or cylinder of wax with a wick that burns to give light." }] },
  kitchen: { sentence: "The chef moved from the food-storage room to the room with the stove and sink: the _____.", alternatives: [
    { word: "pantry", definition: "A small room or cupboard used to store food and kitchen supplies." },
    { word: "dining room", definition: "A room where people sit to eat meals." }] },
  rabbit: { sentence: "The domesticated, long-eared animal living in the family's hutch was a _____.", alternatives: [
    { word: "hare", definition: "A long-eared animal similar to a rabbit whose young are born furred and able to see." },
    { word: "squirrel", definition: "A rodent with a bushy tail, often seen climbing trees." }] },
  dolphin: { sentence: "The marine mammal breathed air through a blowhole and clicked to locate prey: a _____.", alternatives: [
    { word: "shark", definition: "A fish with a skeleton made of cartilage that breathes through gills." },
    { word: "seal", definition: "A marine mammal with flippers that also spends time resting on land or ice." }] },
  thunder: { sentence: "After the bright flash of lightning, the storm produced a rolling sound of _____.", alternatives: [
    { word: "lightning", definition: "A sudden electrical discharge producing a bright flash in the sky." },
    { word: "hail", definition: "Small balls or lumps of ice that fall from clouds." }] },
  winter: { sentence: "The season after autumn and before spring is _____.", alternatives: [
    { word: "autumn", definition: "The season after summer and before winter." },
    { word: "spring", definition: "The season after winter and before summer." }] },
  summer: { sentence: "The season after spring and before autumn is _____.", alternatives: [
    { word: "spring", definition: "The season after winter and before summer." },
    { word: "autumn", definition: "The season after summer and before winter." }] },
  morning: { sentence: "It was after sunrise but still before noon, so it was _____.", alternatives: [
    { word: "afternoon", definition: "The part of the day between noon and evening." },
    { word: "evening", definition: "The part of the day near sunset and before night." }] },
  teacher: { sentence: "Her main job was instructing a class of students at school; she was their _____.", alternatives: [
    { word: "classmate", definition: "Someone who studies in the same class as another student." },
    { word: "examiner", definition: "A person who tests someone's knowledge or assesses their answers." }] },
  heart: { sentence: "The _____ rhythmically pumps blood through the body's vessels.", alternatives: [
    { word: "lung", definition: "An organ that transfers oxygen into the blood and removes carbon dioxide." },
    { word: "liver", definition: "An organ that processes nutrients, produces bile and breaks down harmful substances." }] },
  cheese: { sentence: "Milk curds were pressed and aged to make a block of Cheddar _____.", alternatives: [
    { word: "butter", definition: "A solid dairy food made by churning cream." },
    { word: "yogurt", definition: "A thick dairy food made by fermenting milk with bacteria." }] },
  silver: { sentence: "The metal with the chemical symbol Ag is _____.", alternatives: [
    { word: "aluminum", definition: "A light, silvery metal with the chemical symbol Al." },
    { word: "platinum", definition: "A dense, silvery precious metal with the chemical symbol Pt." }] },
  castle: { sentence: "The medieval ruler's fortified residence, with towers and thick defensive walls, was a _____.", alternatives: [
    { word: "palace", definition: "A grand residence of a ruler or important official, not necessarily fortified." },
    { word: "cathedral", definition: "The principal church of a district, containing a bishop's official seat." }] },
};
