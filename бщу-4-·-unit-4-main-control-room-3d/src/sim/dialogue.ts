import type { CrewRuntime, LogTone, ReactorState } from './types';

export type LogFn = (text: string, tone?: LogTone) => void;

export const CHAT_LINES: string[] = [
  'Akimov: "The rods answer slowly. Be gentle."',
  'Dyatlov: "A simple test. Nothing can go wrong."',
  'Stolyarov (turbine hall): "Ready on our side."',
  'Kiev grid dispatcher: "Hold the output a little longer."',
  'Toptunov: "I did what the program said."',
  'Nobody mentions the test program was rewritten.',
  'Radio: "Pripyat is asleep. Lights are on."',
  'Akimov: "Keep an eye on the period, not just the power."',
  'Toptunov: "Rods are at the edge of the margin."',
  'Stolyarov: "Turbine hall is quiet. Too quiet."',
  'Dyatlov: "Three-quarters of the plant is waiting on this test."',
  'Akimov: "I do not like this, but I will follow the order."',
  'Shift engineer: "Night shift tea is cold again."',
  'Kiev dispatcher: "Unit 4, please confirm your output."',
  'Toptunov: "The xenon is stubborn tonight."',
  'Dyatlov: "Reactors do not just explode. Keep working."',
  'Radio: "Pripyat gates are locked. Sleep well."',
  'Akimov: "Hands off the rods unless you need them."',
  'Stolyarov: "Turbine 8 is warm and ready."',
  'A technician steps in, glances at the board, and steps out.',
  'Dyatlov leans over your shoulder, reads the gauges, says nothing.',
  'Phone rings. Akimov: "Yes, Kiev. Yes, we are on schedule."',
  'Toptunov: "Coffee, engineer?"',
  'Akimov: "If anything looks wrong, say it loudly."',
  'Stolyarov on the phone: "Hall is clear. Hands off the valves."',
  'Someone in the corridor laughs. It sounds far away.',
  'Akimov quietly checks his watch.',
];

interface CrewRule {
  key: string;
  cond: (s: ReactorState) => boolean;
  lines: string[];
  tone: LogTone;
  cooldown: number;
}

const CREW_RULES: CrewRule[] = [
  {
    key: 'pc',
    cond: (s) => s.rho > 480,
    lines: [
      'Toptunov: "Prompt critical! Reactivity is above beta!"',
      'Akimov: "Power is running away! Insert rods!"',
      'Dyatlov: "What is happening to my reactor?!"',
      'Toptunov: "Reactivity is off the chart!"',
      'Akimov: "I would like to speak to whoever invented beta."',
      'Toptunov: "This is the exciting part, I am told!"',
    ],
    tone: 'd',
    cooldown: 7,
  },
  {
    key: 'per5',
    cond: (s) => s.per < 5 && s.P > 40,
    lines: [
      'Akimov: "PERIOD UNDER FIVE SECONDS!"',
      'Toptunov: "The period meter is falling fast!"',
      'Akimov: "Hands off the withdraw button!"',
      'Toptunov: "The period meter is doing something it has never done!"',
      'Akimov: "I would also like to see the period do something slower."',
    ],
    tone: 'd',
    cooldown: 6,
  },
  {
    key: 'per',
    cond: (s) => s.per < 20 && s.P > 40,
    lines: [
      'Akimov: "Period is getting short. Easy on the rods."',
      'Toptunov: "Period under twenty seconds."',
    ],
    tone: 'w',
    cooldown: 12,
  },
  {
    key: 'flowlow',
    cond: (s) => s.flow < 30,
    lines: [
      'Akimov: "Coolant flow is critical!"',
      'Stolyarov: "Pumps are almost stopped!"',
      'Toptunov: "Pump current is almost zero!"',
      'Stolyarov: "The pumps are going slower than my morning commute."',
      'Toptunov: "Flow is low. Hope is lower."',
    ],
    tone: 'd',
    cooldown: 10,
  },
  {
    key: 'flow',
    cond: (s) => s.ph >= 1 && s.flow < 60,
    lines: [
      'Stolyarov: "Turbine 8 is coasting down. Flow is dropping."',
      'Toptunov: "Pump flow is falling as planned."',
    ],
    tone: 'w',
    cooldown: 12,
  },
  {
    key: 'void',
    cond: (s) => s.V > 0.6,
    lines: [
      'Toptunov: "Steam voids are building fast! Do something!"',
      'Akimov: "Voids above sixty percent!"',
      'Stolyarov: "Steam is coming through the separators!"',
      'Toptunov: "The coolant is boiling with enthusiasm."',
      'Stolyarov: "That steam is very keen to be in the turbine."',
    ],
    tone: 'd',
    cooldown: 9,
  },
  {
    key: 'void2',
    cond: (s) => s.V > 0.3,
    lines: [
      'Akimov: "Steam content is rising in the channels."',
      'Toptunov: "Voids are adding power. Watch it."',
    ],
    tone: 'w',
    cooldown: 14,
  },
  {
    key: 'press',
    cond: (s) => s.p > 50,
    lines: [
      'Stolyarov: "Steam pressure is climbing. Open the dump valve?"',
      'Toptunov: "Separator pressure is high."',
    ],
    tone: 'w',
    cooldown: 14,
  },
  {
    key: 'temp',
    cond: (s) => s.Tf > 1000,
    lines: [
      'Akimov: "Fuel temperature is high."',
      'Toptunov: "Fuel channels are running hot."',
    ],
    tone: 'w',
    cooldown: 14,
  },
  {
    key: 'p3',
    cond: (s) => s.P > 3200,
    lines: ['Akimov: "Above nominal power! That is impossible!"'],
    tone: 'd',
    cooldown: 12,
  },
  {
    key: 'p2',
    cond: (s) => s.P > 2000,
    lines: [
      'Toptunov: "Over two thousand megawatts!"',
      'Akimov: "Power is far too high!"',
    ],
    tone: 'd',
    cooldown: 12,
  },
  {
    key: 'p1',
    cond: (s) => s.P > 1000,
    lines: ['Akimov: "We are over one thousand megawatts."'],
    tone: 'w',
    cooldown: 20,
  },
  {
    key: 'orm',
    cond: (s) => !s.scram && Math.round(s.r * 0.6) < 15,
    lines: [
      'Akimov: "ОЗР is below the limit. Regulations say stop."',
      'Dyatlov: "Quit stalling. Pull the rods and keep going."',
      'Toptunov: "We should have stopped hours ago."',
      'Dyatlov: "The margin is a recommendation, not a law."',
      'Toptunov: "ОЗР says eight. SKALA says it is a suggestion."',
      'Akimov: "Regulations say stop. Dyatlov says continue. I say I want a bonus."',
    ],
    tone: 'd',
    cooldown: 18,
  },
  {
    key: 'dyl',
    cond: (s) => s.ph === 0 && s.P < 100 && s.t > 1800,
    lines: [
      'Dyatlov: "Why is power still low? Kiev is waiting."',
      'Dyatlov: "Get the power up. We start the test tonight."',
      'Akimov: "Do not rush it, the rods are slow."',
      'Dyatlov: "Is this reactor on strike?"',
      'Dyatlov: "I have seen tea heat up faster."',
    ],
    tone: 'd',
    cooldown: 18,
  },
  {
    key: 'xe',
    cond: (s) => s.ph === 0 && s.P < 100 && s.X > 0.7,
    lines: [
      'Toptunov: "The xenon is eating all our reactivity."',
      'Akimov: "Poisoned core. We should wait a day, honestly."',
    ],
    tone: 'q',
    cooldown: 25,
  },
  {
    key: 'turb',
    cond: (s) => s.ph === 0 && s.P >= 200 && !s.turb,
    lines: ['Dyatlov: "Connect the turbine. Two hundred megawatts, hold it."'],
    tone: 'd',
    cooldown: 16,
  },
  {
    key: 'good',
    cond: (s) => s.ph === 0 && s.P >= 200 && Boolean(s.turb) && !s.scram,
    lines: [
      'Dyatlov: "Good. Hold it there. The test starts at 01:23:04."',
      'Akimov: "Power steady. Waiting for the test."',
      'Akimov: "Power is steady. I may cry."',
      'Toptunov: "Look at that line. It is almost flat. Beautiful."',
    ],
    tone: 'q',
    cooldown: 22,
  },
  {
    key: 'tt',
    cond: (s) => s.ph === 1 && s.tt > 20,
    lines: [
      'Stolyarov: "Rotor speed is falling. Almost there."',
      'Dyatlov: "Nearly done. Do not touch anything."',
    ],
    tone: 'w',
    cooldown: 10,
  },
  {
    key: 'done',
    cond: (s) => s.ph === 2 && !s.scram,
    lines: [
      'Dyatlov: "Test complete. Shut it down. Now!"',
      'Akimov: "The test is over. Press AZ-5?"',
    ],
    tone: 'd',
    cooldown: 12,
  },
  {
    key: 'bor',
    cond: (s) => s.B > 0.9,
    lines: ['Akimov: "Boron in the core. Reactivity dropping."'],
    tone: 'q',
    cooldown: 6,
  },
  {
    key: 'sc1',
    cond: (s) => Boolean(s.scram) && s.sT < 2 && s.rP >= 40,
    lines: ['Akimov: "Rods dropping from a good margin. Power falling."'],
    tone: 'q',
    cooldown: 30,
  },
  {
    key: 'sc2',
    cond: (s) => Boolean(s.scram) && s.sT < 2 && s.rP < 40,
    lines: [
      'Toptunov: "Power is rising after AZ-5!"',
      'Akimov: "The rods are making it worse!"',
    ],
    tone: 'd',
    cooldown: 30,
  },
  {
    key: 'yank',
    cond: (s) => s.crew.hd > 2.2 && !s.scram,
    lines: [
      'Akimov: "What are you doing?! Slow down on the rods!"',
      'Toptunov: "Easy, easy! The rods are not a toy!"',
      'Dyatlov: "Careful! Not so fast!"',
      'Akimov: "Engineer! Smaller steps!"',
      'Toptunov: "The rods are not an accordion!"',
      'Akimov: "Smaller steps! You are not rowing a boat!"',
      'Dyatlov: "Gentle! It is a reactor, not a lawn mower!"',
    ],
    tone: 'd',
    cooldown: 9,
  },
  {
    key: 'allout',
    cond: (s) => !s.scram && s.r < 8 && s.P > 30,
    lines: [
      'Akimov: "Every rod is out! Are you insane?"',
      'Toptunov: "Zero rods in the core! That is below any rule!"',
      'Akimov: "Put the rods back in! Now!"',
      'Toptunov: "That is not a rod position, that is a cry for help."',
      'Akimov: "At zero rods, even the reactor is surprised."',
    ],
    tone: 'd',
    cooldown: 12,
  },
  {
    key: 'allin',
    cond: (s) => !s.scram && s.r > 92 && s.ph < 2 && s.t > 1800,
    lines: [
      'Dyatlov: "Why are all rods in? Power will drop to nothing!"',
      'Akimov: "Everything is inserted. Are we shutting down?"',
    ],
    tone: 'w',
    cooldown: 15,
  },
  {
    key: 'idle',
    cond: (s) => s.crew.idle > 30 && !s.scram,
    lines: [
      'Akimov: "Engineer? Are you still with us?"',
      'Toptunov: "You have gone quiet. Everything okay?"',
      'Dyatlov: "Do not just stare at the board. Do something."',
      'Akimov: "Say something, comrade. I do not like the silence."',
      'Toptunov: "Are you meditating or just resting your eyes?"',
      'Akimov: "The reactor is not going to run itself. Probably."',
      'Dyatlov: "I have seen faster paperwork than this."',
    ],
    tone: 'q',
    cooldown: 30,
  },
  {
    key: 'rec',
    cond: (s) => s.crew.wasPC && s.rho < 200,
    lines: [
      'Akimov: "We are back below beta. Breathe."',
      'Toptunov: "Phew. Power is coming back under control."',
      'Akimov: "That was too close. Good recovery."',
      'Toptunov: "I just aged ten years. It is fine."',
      'Akimov: "Please do not do that again. My heart has one beat left."',
    ],
    tone: 'q',
    cooldown: 5,
  },
  {
    key: 'steady',
    cond: (s) => s.ph === 1 && s.tt > 12 && s.per > 30 && s.rho < 300 && s.rho > -200,
    lines: [
      'Akimov: "Steady hands. Keep it up."',
      'Toptunov: "You are handling this well."',
      'Stolyarov: "Turbine hall is impressed."',
      'Stolyarov: "Hands like a watchmaker."',
      'Toptunov: "I would hire you, engineer. Sadly I have no authority."',
    ],
    tone: 'q',
    cooldown: 18,
  },
];

const CONVERSATIONS: Array<[string, string[]]> = [
  ['any', ['Akimov: "Who took my mug?"', 'Toptunov: "Which one?"', 'Akimov: "The one that says World\'s Okayest Shift Supervisor."', 'Stolyarov: "It does not say that. Someone scratched the rest off."']],
  ['any', ['Stolyarov: "Does anyone want half a sausage sandwich?"', 'Toptunov: "From the canteen?"', 'Stolyarov: "My wife made it."', 'Toptunov: "Then yes. Absolutely yes."']],
  ['any', ['Toptunov: "SKALA says the ОЗР is eight rods."', 'Akimov: "SKALA also said yesterday was Tuesday."', 'Toptunov: "Yesterday was Friday."', 'Akimov: "Exactly. Do not trust it blindly."']],
  ['any', ['Akimov: "Who opened the window?"', 'Stolyarov: "Nobody. It broke in 1983."', 'Akimov: "Put in a request."', 'Stolyarov: "I did. Form 17-B. It needs three signatures."', 'Akimov: "Then you are three signatures away from fresh air."']],
  ['any', ['Technician: "There is a cat in the corridor."', 'Stolyarov: "Is it lost?"', 'Technician: "No. It sleeps on the warm pipes. It lives here."', 'Akimov: "Best employee on the shift."']],
  ['any', ['Toptunov: "I named the stubborn rod Boris."', 'Akimov: "Why Boris?"', 'Toptunov: "He never moves when asked."', 'Stolyarov: "Boris has been on strike since March."']],
  ['any', ['Stolyarov: "I can beat Anatoly Karpov."', 'Akimov: "At what?"', 'Stolyarov: "Chess."', 'Toptunov: "You lost to the samovar yesterday."', 'Stolyarov: "The samovar cheated."']],
  ['any', ['Toptunov: "My dosimeter reads 0.1."', 'Akimov: "Is it broken?"', 'Toptunov: "It reads the same every night. A very loyal dosimeter."']],
  ['any', ['Phone rings. Akimov: "It is Moscow."', 'Toptunov: "Pretend we are not here."', 'Akimov: "There are four of us in a glass room."', 'Toptunov: "Then pretend harder."']],
  ['any', ['Technician: "The cat has a name now."', 'Akimov: "What is it?"', 'Technician: "Comrade Whiskers."', 'Stolyarov: "Does Comrade Whiskers have clearance?"', 'Technician: "He sleeps on the clearance."']],
  ['any', ['Toptunov: "SKALA just printed a line of question marks."', 'Akimov: "What does that mean?"', 'Toptunov: "It is thinking."', 'Akimov: "It has been thinking since 1983."']],
  ['any', ['Stolyarov: "Canteen menu tonight: cabbage, cabbage, or surprise cabbage."', 'Toptunov: "What is the surprise?"', 'Stolyarov: "Usually it is cabbage."']],
  ['any', ['Technician: "Comrade Whiskers is on the keyboard."', 'Akimov: "What did he type?"', 'Technician: "aaaaaaaaaaaaaaaa."', 'Toptunov: "That is the most reasonable input tonight."']],
  ['any', ['Akimov: "Boris filed a complaint."', 'Toptunov: "Boris is a rod."', 'Akimov: "Rods have rights."', 'Stolyarov: "Boris wants a window that opens."']],
  ['any', ['Dyatlov: "Gentlemen, confidence is half of safety."', 'Akimov: "What is the other half?"', 'Dyatlov: "Also confidence."']],
  ['any', ['Dyatlov: "Rule one: the reactor is always correct."', 'Akimov: "Rule two?"', 'Dyatlov: "See rule one."']],
  ['any', ['Stolyarov: "I can beat Anatoly Karpov."', 'Akimov: "He is a grandmaster. He plays the world\'s best."', 'Stolyarov: "He has never faced a night shift."', 'Toptunov: "He has never faced Boris."']],
  ['any', ['Toptunov: "I named the reactor Vasily."', 'Akimov: "Why Vasily?"', 'Toptunov: "It is moody and eats a lot."']],
  ['any', ['Akimov: "I wrote a safety poster."', 'Toptunov: "What does it say?"', 'Akimov: "Do not be a hero. Be a retired hero."']],
  ['any', ['Toptunov: "I have an idea for improving safety."', 'Akimov: "Yes?"', 'Toptunov: "More cats."', 'Technician: "Comrade Whiskers approves."']],
  ['pre', ['Dyatlov: "Who wrote this test program?"', 'Akimov: "The electrical department."', 'Dyatlov: "Does it say what to do if it fails?"', 'Akimov: "It says it will not."', 'Dyatlov: "Good. Then we do not need a plan B."']],
  ['pre', ['Toptunov: "The xenon is not going away."', 'Akimov: "It never does."', 'Toptunov: "We could wait a day."', 'Dyatlov: "We could. We will not."']],
  ['pre', ['Dyatlov: "Is everyone ready?"', 'Silence. Nobody answers.', 'Dyatlov: "Good. Silence is agreement."', 'Akimov: "I would like that in writing."']],
  ['test', ['Stolyarov: "Rotor is slowing. How is your end?"', 'Toptunov: "Sweaty."', 'Akimov: "Everybody stay calm."', 'Toptunov: "I am calm. I am just sweaty."']],
  ['test', ['Dyatlov: "A simple test. What is the worst that can happen?"', 'Toptunov: "Please do not ask that out loud."', 'Akimov: "Please do not ask that, ever."']],
  ['test', ['Akimov: "On three, everyone panic quietly."', 'Toptunov: "One."', 'Stolyarov: "Two."', 'Akimov: "Actually, let us not do three."']],
  ['post', ['Akimov: "Test is over. Everyone breathe."', 'Toptunov: "I have been holding my breath since the pumps started."', 'Stolyarov: "Then breathe. Slowly."']],
  ['post', ['Stolyarov: "Someone should tell the cat we survived."', 'Technician: "He already knows. He is asleep."']],
];

const RANDOM_BS: string[] = [
  'Toptunov: "I think the reactor is just a very large kettle."',
  'Akimov: "If you stare at a gauge long enough, it blinks first."',
  'Stolyarov: "I saw a pigeon in the turbine hall. It had a badge."',
  'Dyatlov: "Why is everything blue? Who painted it blue?"',
  'Technician: "Does anyone know a good recipe for pickled mushrooms?"',
  'Stolyarov: "I can beat Anatoly Karpov."',
  'Toptunov: "What if xenon is just shy neutrons?"',
  'Akimov: "I am once again asking for a window that opens."',
  'Radio: "...krshh... six cucumbers... krshh... over."',
  'Toptunov: "Do clouds have xenon?"',
  'Stolyarov: "Do rods have feelings? Be nice to Boris."',
  'Technician: "A cabbage rolled under the panel. Nobody touch it."',
  'Radio: "...krshh... today\'s winning number is potato... krshh..."',
  'Toptunov: "I am pretty sure the pigeon is unionizing."',
  'Stolyarov: "I made a sandwich in the shape of a rod. It was delicious and inserted."',
  'Technician: "Comrade Whiskers is sleeping on the warm steam header."',
];

const AFK_LINES: string[] = [
  'Akimov: "Engineer? You are very still. Are you a statue?"',
  'Toptunov: "I think he fell asleep with his eyes open."',
  'Stolyarov: "Should we poke him? Gently."',
  'Dyatlov: "Is anybody at the console?! Hello?!"',
  'Akimov: "He has not touched a rod in a minute. Brave or broken."',
  'Toptunov: "Maybe he left. Do we give the console to the cat?"',
];

interface PanicRule {
  key: string;
  cond: (s: ReactorState) => boolean;
  lines: string[];
  cooldown: number;
}

const PANIC_RULES: PanicRule[] = [
  {
    key: 'combo',
    cond: (s) => s.r < 3 && !s.pa && !s.pb && !s.scram,
    lines: ['Akimov: "NO PUMPS AND NO RODS?! ARE YOU INSANE?!"', 'Toptunov: "EVERYTHING IS WRONG AT ONCE!"', 'Stolyarov: "MOTHER OF GOD!"'],
    cooldown: 12,
  },
  {
    key: 'rout',
    cond: (s) => s.r < 3 && !s.scram && s.P > 25,
    lines: ['Akimov: "ALL THE RODS ARE OUT!"', 'Toptunov: "ZERO! THEY ARE AT ZERO!"', 'Dyatlov: "WHAT ARE YOU DOING?! PUT THEM BACK IN!"'],
    cooldown: 14,
  },
  {
    key: 'pumps0',
    cond: (s) => !s.pa && !s.pb,
    lines: ['Akimov: "BOTH PUMPS ARE OFF!"', 'Stolyarov: "NO FLOW! NO FLOW!"', 'Toptunov: "THE CORE WILL BOIL!"'],
    cooldown: 10,
  },
  {
    key: 'melt',
    cond: (s) => s.Tf > 2300,
    lines: ['Akimov: "THE FUEL IS MELTING!"', 'Dyatlov: "IT CANNOT BE! A SENSOR ERROR!"', 'Toptunov: "I AM TELLING YOU IT IS REAL!"'],
    cooldown: 20,
  },
  {
    key: 'scrambad',
    cond: (s) => Boolean(s.scram) && s.rP < 20 && s.sT < 4,
    lines: ['Toptunov: "POWER IS RISING AFTER АЗ-5! WHY IS IT RISING?!"', 'Akimov: "IT IS NOT STOPPING!"'],
    cooldown: 30,
  },
  {
    key: 'pcrit',
    cond: (s) => s.rho > 480,
    lines: ['Toptunov: "PROMPT CRITICAL! PROMPT CRITICAL!"', 'Akimov: "POWER IS EXPLODING UPWARD!"'],
    cooldown: 8,
  },
  {
    key: 'per3',
    cond: (s) => s.per < 3 && s.P > 40,
    lines: ['Akimov: "PERIOD IS THREE SECONDS!"', 'Dyatlov: "INSERT THE RODS! DO SOMETHING!"'],
    cooldown: 8,
  },
  {
    key: 'voidp',
    cond: (s) => s.V > 0.6,
    lines: ['Stolyarov: "THE CHANNELS ARE BOILING!"', 'Toptunov: "VOIDS EVERYWHERE!"'],
    cooldown: 10,
  },
  {
    key: 'flowp',
    cond: (s) => s.flow < 20 && s.P > 100,
    lines: ['Toptunov: "FLOW IS DEAD! FLOW IS DEAD!"', 'Akimov: "WE HAVE NO COOLING!"'],
    cooldown: 12,
  },
  {
    key: 'pressp',
    cond: (s) => s.p > 80,
    lines: ['Stolyarov: "PRESSURE IS CLIMBING! OPEN THE DUMP VALVE!"', 'Toptunov: "THE SEPARATORS ARE SCREAMING!"'],
    cooldown: 12,
  },
  {
    key: 'tempp',
    cond: (s) => s.Tf > 1800,
    lines: ['Akimov: "FUEL TEMPERATURE IS THROUGH THE ROOF!"', 'Toptunov: "THE GAUGE IS PEGGED!"'],
    cooldown: 12,
  },
  {
    key: 'powp',
    cond: (s) => s.P > 2000,
    lines: ['Toptunov: "TWO THOUSAND! THREE THOUSAND!"', 'Akimov: "THE RECORDER PEN IS OFF THE PAPER!"'],
    cooldown: 10,
  },
  {
    key: 'contp',
    cond: (s) => s.co < 70,
    lines: ['Akimov: "CONTAINMENT IS FAILING!"', 'Toptunov: "THE WALLS ARE CRACKING!"'],
    cooldown: 15,
  },
];

const ACTION_LINES: Record<string, { tone: LogTone; lines: string[]; cd?: number }> = {
  p0: {
    tone: 'd',
    lines: [
      'Akimov: "BOTH PUMPS ARE OFF! WHAT ARE YOU DOING?!"',
      'Stolyarov: "No coolant circulation! Are you out of your mind?!"',
      'Toptunov: "Both pumps off. Brave. Not smart. Brave."',
    ],
  },
  p1: {
    tone: 'd',
    lines: [
      'Akimov: "Why did you stop a pump? Who allowed that?"',
      'Toptunov: "We just lost a coolant pump. What are you doing?!"',
    ],
  },
  p2: {
    tone: 'q',
    lines: [
      'Akimov: "Pump back on. Thank you."',
      'Toptunov: "Flow restored. Do not scare us like that."',
    ],
  },
  t0: {
    tone: 'd',
    lines: [
      'Dyatlov: "Who disconnected the turbine?!"',
      'Akimov: "The test needs that turbine, engineer."',
    ],
  },
  t1: {
    tone: 'q',
    lines: [
      'Stolyarov: "Turbine synchronized. The grid sees us."',
      'Akimov: "Generator online. Output is positive."',
    ],
  },
  bo: {
    tone: 'w',
    lines: [
      'Dyatlov: "Boron? Why boron? We need power!"',
      'Akimov: "Boron in. Smart, if power was running away."',
    ],
  },
  ec: {
    tone: 'd',
    lines: [
      'Dyatlov: "Who authorized ECCS?!"',
      'Akimov: "Emergency cooling is flooding the core!"',
    ],
  },
  cv: {
    tone: 'd',
    lines: [
      'Akimov: "You lifted the АЗ-5 cover. Are we scramming?"',
      'Toptunov: "The cover is open. Please tell me you know what you are doing."',
      'Dyatlov: "Close that cover. We are not stopping."',
    ],
    cd: 3,
  },
  sc: {
    tone: 'd',
    lines: [
      'Dyatlov: "АЗ-5?! Who gave that order?!"',
      'Akimov: "АЗ-5 pressed! All rods going in!"',
      'Toptunov: "Scram! Scram!"',
    ],
  },
  v0: { tone: 'q', lines: ['Stolyarov: "Dump valve closed. Pressure is happy."'], cd: 3 },
  v1: { tone: 'q', lines: ['Stolyarov: "Steam dump is moving. Separator pressure easing."'], cd: 3 },
  v2: { tone: 'w', lines: ['Stolyarov: "Why is the steam dump wide open?!"', 'Dyatlov: "Close that valve. We need the steam."'], cd: 3 },
};

export function createCrewRuntime(): CrewRuntime {
  return {
    flags: {},
    tick: 0,
    q: [],
    qt: 0,
    ct: 6,
    used: [],
    cd: {},
    gap: 0,
    idle: 0,
    hd: 0,
    wasPC: false,
    rn: 8,
    li: -1,
    pq: [],
    pt: 0,
    pcd: {},
    lastSay: {},
  };
}

export function onceLog(s: ReactorState, key: string, text: string, tone: LogTone, log: LogFn) {
  if (!s.crew.flags[key]) {
    s.crew.flags[key] = 1;
    log(text, tone);
  }
}

export function triggerActionReaction(s: ReactorState, actionKey: string, nowSec: number, log: LogFn) {
  const entry = ACTION_LINES[actionKey];
  if (!entry) return;
  const cd = entry.cd ?? 2;
  if (nowSec - (s.crew.lastSay[actionKey] ?? -99) < cd) return;
  s.crew.lastSay[actionKey] = nowSec;
  s.crew.idle = 0;
  log(entry.lines[Math.floor(Math.random() * entry.lines.length)], entry.tone);
}

function runPanic(s: ReactorState, dt: number, log: LogFn): boolean {
  const c = s.crew;
  c.pt -= dt;
  for (const k in c.pcd) c.pcd[k] -= dt;
  if (c.pq.length) {
    if (c.pt <= 0) {
      const msg = c.pq.shift();
      if (msg) log(msg, 'd');
      c.pt = 0.75;
    }
    return true;
  }
  for (const rule of PANIC_RULES) {
    if (!((c.pcd[rule.key] ?? 0) > 0) && rule.cond(s)) {
      c.pcd[rule.key] = rule.cooldown;
      c.pq = rule.lines.slice();
      c.q = [];
      c.gap = 2;
      c.pt = 0;
      return true;
    }
  }
  return false;
}

function runConvo(s: ReactorState, dt: number, log: LogFn) {
  const c = s.crew;
  if (s.scram || s.rho > 480 || s.per < 5) {
    c.q = [];
    return;
  }
  c.qt -= dt;
  c.ct -= dt;
  if (c.q.length && c.qt <= 0) {
    const line = c.q.shift();
    if (line) log(line, 'q');
    c.qt = 3.4;
    c.gap = Math.max(c.gap, 1);
    if (!c.q.length) c.ct = 8 + Math.random() * 7;
  } else if (!c.q.length && c.ct <= 0) {
    const ph = s.ph === 0 ? 'pre' : s.ph === 1 ? 'test' : 'post';
    let pool = CONVERSATIONS.map((cv, idx) => ({ cv, idx })).filter(
      ({ cv, idx }) => (cv[0] === 'any' || cv[0] === ph) && !c.used.includes(idx),
    );
    if (!pool.length) {
      c.used = [];
      pool = CONVERSATIONS.map((cv, idx) => ({ cv, idx })).filter(
        ({ cv }) => cv[0] === 'any' || cv[0] === ph,
      );
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) {
      c.used.push(pick.idx);
      c.q = pick.cv[1].slice();
      c.ct = 99;
    }
  }
}

function runRandom(s: ReactorState, dt: number, log: LogFn) {
  const c = s.crew;
  if (s.scram || s.rho > 480 || s.per < 5) return;
  c.rn -= dt;
  if (c.rn > 0) return;
  if (c.q.length) {
    c.rn = 1.5;
    return;
  }
  c.rn = 6 + Math.random() * 9;
  const afk = c.idle > 45 && Math.random() < 0.5;
  const pool = afk ? AFK_LINES : RANDOM_BS;
  let i = Math.floor(Math.random() * pool.length);
  if (i === c.li && pool.length > 1) i = (i + 1) % pool.length;
  c.li = i;
  log(pool[i], 'f');
}

export function stepCrewDialogue(s: ReactorState, dt: number, holdDir: number, log: LogFn) {
  const c = s.crew;
  c.tick += dt;
  if (c.tick > 45) {
    c.tick = 0;
    log(CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)], 'q');
  }

  if (runPanic(s, dt, log)) return;
  runConvo(s, dt, log);
  runRandom(s, dt, log);

  c.gap -= dt;
  if (holdDir !== 0) c.idle = 0;
  else c.idle += dt;
  c.hd = holdDir !== 0 ? c.hd + dt : 0;
  if (s.rho > 480) c.wasPC = true;
  for (const k in c.cd) c.cd[k] -= dt;
  if (c.gap > 0) return;

  for (const rule of CREW_RULES) {
    if (
      !((c.cd[rule.key] ?? 0) > 0) &&
      !(c.q.length && rule.tone !== 'd') &&
      rule.cond(s)
    ) {
      c.cd[rule.key] = rule.cooldown;
      c.gap = 2.2;
      if (rule.key === 'rec') c.wasPC = false;
      log(rule.lines[Math.floor(Math.random() * rule.lines.length)], rule.tone);
      return;
    }
  }
}
