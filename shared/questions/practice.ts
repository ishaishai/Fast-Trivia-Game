/**
 * The practice set — public, unranked, never used in competitions.
 * Every question carries a one-line fact shown after you answer.
 */
import type { QuestionDef } from '../types';
import { build } from './build';

export const PRACTICE: QuestionDef[] = [
  ...build('p-', 'earth', [
    [1, 'What is the capital of Portugal?', ['Lisbon', 'Porto', 'Madrid', 'Faro'], 'Lisbon is one of the oldest cities in western Europe.'],
    [2, 'Which is the largest desert on Earth?', ['Antarctica', 'Sahara', 'Gobi', 'Arabian'], 'A desert is defined by rainfall, not heat.'],
    [1, 'Venice is famous for its…', ['Canals', 'Volcanoes', 'Glaciers'], 'The city is built across more than a hundred small islands.'],
    [2, 'Petra is in which country?', ['Jordan', 'Egypt', 'Lebanon', 'Syria'], 'Petra was carved straight into rose-coloured sandstone.'],
    [1, 'Iceland is milder than its name suggests.', true, 'Gulf Stream waters keep its coasts warmer than Greenland’s.'],
  ]),
  ...build('p-', 'science', [
    [2, 'Which metal conducts electricity best?', ['Silver', 'Copper', 'Gold', 'Aluminium'], 'Copper wins on price; silver wins on physics.'],
    [1, 'The Eiffel Tower grows taller in summer.', true, 'Heat expands its iron by up to about 15 cm.'],
    [2, 'Which colour of light has the longest wavelength?', ['Red', 'Violet', 'Green', 'Blue'], 'Violet sits at the short end of the visible spectrum.'],
    [1, 'Ice is less dense than liquid water.', true, 'That’s why ice floats and lakes freeze from the top down.'],
    [3, 'What is the most abundant element in the universe?', ['Hydrogen', 'Helium', 'Oxygen', 'Carbon'], 'About three quarters of all normal matter is hydrogen.'],
  ]),
  ...build('p-', 'orbit', [
    [2, 'Which planet has the shortest day?', ['Jupiter', 'Earth', 'Mars', 'Venus'], 'Jupiter spins once in under ten hours.'],
    [2, 'Which planet has the fastest winds?', ['Neptune', 'Jupiter', 'Saturn', 'Earth'], 'Neptune’s winds top 2,000 km/h.'],
    [1, 'The Moon always shows Earth the same face.', true, 'It spins once for every orbit. That’s tidal locking.'],
    [3, 'Which star is closest to the Sun?', ['Proxima Centauri', 'Sirius', 'Betelgeuse', 'Polaris'], 'Proxima Centauri is about 4.2 light-years away.'],
    [1, 'Which planet is famous for its rings?', ['Saturn', 'Mars', 'Mercury'], 'Jupiter, Uranus and Neptune have rings too, just fainter.'],
  ]),
  ...build('p-', 'past', [
    [2, 'Who invented the movable-type printing press?', ['Johannes Gutenberg', 'Leonardo da Vinci', 'Isaac Newton'], 'His press dates to around 1440.'],
    [1, 'Ancient Rome was ruled by emperors.', true, 'Augustus became the first emperor in 27 BC.'],
    [1, 'The pyramids of Giza are in…', ['Egypt', 'Mexico', 'Sudan', 'Peru'], 'The Great Pyramid was the tallest human-made structure for about 3,800 years.'],
    [3, 'Which civilisation invented paper?', ['Chinese', 'Egyptian', 'Greek', 'Roman'], 'Cai Lun is credited with refining papermaking around 105 AD.'],
    [1, 'Medieval knights’ armour was made mostly of…', ['Metal', 'Wood', 'Glass'], 'A full suit of plate armour weighed around 20 to 25 kg.'],
  ]),
  ...build('p-', 'canvas', [
    [2, 'Which artist is known for drip paintings?', ['Jackson Pollock', 'Mark Rothko', 'Andy Warhol', 'Henri Matisse'], 'Pollock laid his canvases on the floor to paint them.'],
    [1, 'Red and blue paint mix to make…', ['Purple', 'Green', 'Orange'], 'Add white and you get lavender.'],
    [2, 'The Mona Lisa hangs in which museum?', ['The Louvre', 'The Uffizi', 'The Prado', 'The Met'], 'She sits behind bulletproof glass.'],
    [3, 'Who designed the Nike Swoosh?', ['Carolyn Davidson', 'Paul Rand', 'Saul Bass', 'Milton Glaser'], 'She was paid $35 for it as a student in 1971.'],
    [1, 'A logo is one part of a brand identity.', true, 'The best identities still work in plain black and white.'],
  ]),
  ...build('p-', 'sound', [
    [1, 'Which instrument has black and white keys?', ['Piano', 'Violin', 'Flute'], 'Most pianos have 52 white keys and 36 black.'],
    [2, 'Who wrote the Ode to Joy melody?', ['Beethoven', 'Mozart', 'Bach', 'Haydn'], 'It closes his Ninth Symphony.'],
    [2, 'The tuba belongs to which family?', ['Brass', 'Woodwind', 'Strings'], 'It is the lowest-pitched member of the brass family.'],
    [1, 'Music marked “piano” is played softly.', true, 'The instrument’s full name is pianoforte: soft-loud.'],
    [3, 'How many strings does a violin have?', ['Four', 'Five', 'Six', 'Three'], 'They are tuned G, D, A and E.'],
  ]),
  ...build('p-', 'screen', [
    [1, 'Which film has a shark terrorising a beach town?', ['Jaws', 'Titanic', 'Up'], 'Jaws helped invent the summer blockbuster in 1975.'],
    [2, 'Which studio made Toy Story?', ['Pixar', 'DreamWorks', 'Studio Ghibli', 'Aardman'], 'It was the first fully computer-animated feature film.'],
    [1, 'E.T. is an alien.', true, 'E.T. stands for “the Extra-Terrestrial”.'],
    [2, 'The Lord of the Rings films were shot in…', ['New Zealand', 'Ireland', 'Canada', 'Norway'], 'Peter Jackson filmed all three back to back.'],
    [3, 'Who directed the 1960 thriller Psycho?', ['Alfred Hitchcock', 'Stanley Kubrick', 'Orson Welles', 'Billy Wilder'], 'Hitchcock bought up copies of the novel to keep the twist secret.'],
  ]),
  ...build('p-', 'words', [
    [1, '“Ciao” can mean hello and…', ['Goodbye', 'Thank you', 'Sorry'], 'It comes from a Venetian phrase meaning “your servant”.'],
    [2, 'A word that reads the same backwards is a…', ['Palindrome', 'Pangram', 'Portmanteau'], '“Level”, “noon” and “kayak” all qualify.'],
    [2, '“Brunch” blends breakfast and lunch. It’s a…', ['Portmanteau', 'Palindrome', 'Prefix'], 'Lewis Carroll popularised the term in 1871.'],
    [1, '“Smog” blends smoke and fog.', true, 'The word dates back to early-1900s London.'],
    [3, 'A sentence using every letter is a…', ['Pangram', 'Palindrome', 'Haiku'], '“The quick brown fox jumps over the lazy dog” is the classic.'],
  ]),
  ...build('p-', 'wild', [
    [1, 'How many arms does an octopus have?', ['Eight', 'Six', 'Ten'], 'Each arm has its own cluster of neurons.'],
    [1, 'Which bird lays the largest eggs?', ['Ostrich', 'Emu', 'Eagle', 'Swan'], 'One ostrich egg equals about two dozen hen’s eggs.'],
    [2, 'A group of flamingos is a…', ['Flamboyance', 'Parliament', 'Murder'], 'Their pink comes from pigments in what they eat.'],
    [2, 'Sloths can hold their breath longer than dolphins.', true, 'By slowing their heart, sloths can last up to about 40 minutes.'],
    [3, 'Which animal has the strongest measured bite?', ['Saltwater crocodile', 'Lion', 'Great white shark', 'Hippo'], 'Its bite was measured at about 3,700 psi.'],
  ]),
  ...build('p-', 'play', [
    [1, 'How many players per side in volleyball?', ['Six', 'Five', 'Seven'], 'Teams rotate position each time they win back the serve.'],
    [2, 'The five Olympic rings stand for…', ['Five continents', 'Five sports', 'Five cities'], 'Pierre de Coubertin designed them in 1913.'],
    [2, 'Three strikes in a row in bowling is a…', ['Turkey', 'Hat-trick', 'Triple'], 'A perfect game is twelve strikes in a row: 300.'],
    [1, 'Golf balls have dimples.', true, 'Dimples help the ball fly roughly twice as far.'],
    [3, 'Which country has hosted the most Summer Olympics?', ['United States', 'France', 'Great Britain', 'Greece'], 'Los Angeles hosts again in 2028.'],
  ]),
  ...build('p-', 'taste', [
    [1, 'Raisins are dried…', ['Grapes', 'Plums', 'Cherries'], 'It takes about four kilos of grapes to make one kilo of raisins.'],
    [2, 'Nutella is made with which nut?', ['Hazelnut', 'Almond', 'Peanut', 'Walnut'], 'It began as a way to stretch scarce cocoa.'],
    [1, 'Peanuts are not true nuts.', true, 'They are legumes, like peas and lentils.'],
    [2, 'The kipferl, the croissant’s ancestor, comes from…', ['Austria', 'France', 'Italy', 'Germany'], 'Viennese bakers shaped crescents long before Paris did.'],
    [2, 'Capsaicin makes chillies taste…', ['Hot', 'Sour', 'Bitter', 'Sweet'], 'Birds can’t feel it, so they happily spread the seeds.'],
  ]),
  ...build('p-', 'code', [
    [1, 'Wi-Fi lets devices…', ['Connect without cables', 'Charge faster', 'Print photos'], 'Wi-Fi is a brand name, not an abbreviation.'],
    [3, 'The first .com domain ever registered was…', ['symbolics.com', 'apple.com', 'ibm.com', 'google.com'], 'It was registered on 15 March 1985.'],
    [2, 'Who invented the computer mouse?', ['Douglas Engelbart', 'Steve Jobs', 'Bill Gates', 'Alan Kay'], 'His 1960s prototype was carved from wood.'],
    [1, 'Phone cameras can read QR codes.', true, 'QR stands for “quick response”.'],
    [2, 'The first famous emoji set came from…', ['Japan', 'USA', 'Korea', 'Finland'], 'Shigetaka Kurita’s 1999 set had 176 symbols.'],
  ]),
];
