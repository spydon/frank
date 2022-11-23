import axios from 'axios';
import { ActivityHandler, MessageFactory, TurnContext } from 'botbuilder';
import { MESSAGES_PATH } from 'botbuilder/lib/streaming';
import { parse } from 'node-html-parser';
import emojis = require('emoji-random-list');

const url = 'https://www.sabis.se/restauranger-cafeer/vara-foretagsrestauranger/skandia/';
const AxiosInstance = axios.create();
const iconMap = {
    'icon--gluten': '🌾',
    'icon--lactose': '🥛',
    'icon--farmers-choice': '🧑‍🌾'
};

const yesNoReplies = [
    'Ja?', 'Nej.', 'Nja.', 'Säger du det så.', 'Är det inte dags för dig att jobba lite?', 'Absolut.',
    'Lugn nu.', 'Javisst!', 'Någon tycker säkert att det är så i alla fall.', 'Vad tycker du?',
    'Lyssna på <name> istället, jag vet ingenting.',
    'Det kan vara så, i vilket fall så är det nog <name>\'s fel.',
    'Ja för att tänka fritt är stort, men att tänka som <name> är större.',
    'Strunta i den frågan, dags att fika! Eller vad säger du <name>?',
    'Så sant som att en <noun> är en delikatess för <name>.'
];

const whenReplies = [
    'Nu.', 'Imorgon.', 'Aldrig, om du frågar mig, vilket du gjorde.', 'Den dagen en <noun> är en <noun>.',
    'Rätt säker på att det blir det här årtiondet i alla fall!', 'På momomongen!',
    'Hade en <noun> prokrastinerat med det?'
]

const whereReplies = [
    'I Sabis.', 'I Ritrovo.', 'Hemma hos <name>!', "Vart som helst förutom i <name>'s källare!",
    'På taket.', 'Nivå22?', 'T-Centralen.', 'Vi går till ett zoo och hittar buren för en <noun>!'
]

const nameReplies = [
    'Definitivt <name>.', 'Man skulle kunna tro att det är <name> som ligger bakom allting.',
    'Den vise <name>, som jag brukar säga.', '<name> =', 'Ole dole doff <name>.',
    '<name> och en dag kommer det faktist resa en <noun> till kontoret.',
    "Det vet jag inte, men <name>'s dröm-husdjur är i alla fall en <noun>.",
    'Vad det blir för lunch? <name> kommer i alla fall att äta en <noun>.',
    "Jag vet inte, men fråga <name>'s <noun>, den vet saker...",
    '<name> och jag har en grej going, så jag passar på den.',
    'Fråga <name> direkt istället.', 'En <noun> håller inga hemligheter om <name>.',
    'Det var en gång en <noun>, och det var <name>.'
];

const fikaReplies = [
    'Fikapauser är att rekommendera, för mycket kod såsar ihop hjärnkontoret.',
    'Absolut fikadags! Blir en <noun> till fika idag.',
    'Kalla det möte, men ät bullar. Det gör chefen hela tiden.',
    'Om man skulle ta och vända på det istället? Vi kör fika som standard och ibland så jobbar vi också.',
    'Mitt favotitfika är i alla fall <noun>!',
    'Kör en <noun> i micron och käka, mycket protein har jag hört.',
    'Om du först rider ner till ritrovo på en <noun>, då är du nog värd en fika sen kan jag tycka!',
    'En <noun> till fikat, är den medbjuden eller ska den ätas?',
    'Ta med <name> till Ritrovo och dela på en <noun> vetja!',
    'En <noun> ner i en mixer bara, nyttigt och fettsnålt!'
];

const names = [
    'Johannes', 'Lukas', 'Simon', 'UX-Jörgen', 'Jörgen', 'Abdi', 'Teddy', 'Jocke', 'Frida', 'Lars',
    'Tor', 'Fredrik', 'Tobias', 'Petrus', 'Johan', 'Anders', 'Rickard', 'John', 'Samuel', 'Sofie'
];

// Substantiv (en)
const nouns = [
    'elefant', 'get', 'gås', 'fiskmås', 'hummer', 'hamster', 'gospelkör', 'helikopter',
    'valross', 'stol', 'kaviartub', 'lampa', 'påse kreditkort', 'mobil', 'flygande matta',
    'båt', 'fläskig dam', 'scout', 'fet gubbe', 'Trump', 'Putin', 'skolklass', 'skolfröken',
    'häst och vagn', 'semla', '12 centimeters drake', 'begagnad macka ifrån dagis',
    'vante', 'ölbricka', 'shotbricka', 'lever'
];

const factReplies = [
    'Icke existerande frågor, får icke-existerande svar; <noun>.',
    'Mycket bra konstaterande!',
    'Tror faktiskt att du har fel där.',
    'Flat-earther!',
    'Ingenting är säkert, förutom att <name> är en <noun>.',
    'Bra sagt, vill bara passa på att varna för blixthalka pga en utsmetad <noun>.',
    '<noun> + <noun> = ',
    '<name> + <noun> = ',
    '<name> + <name> = ',
    'Great bots think alike, eller hur <name>?',
    '<name> tänker för mycket.',
    '<name> tänker för mycket lite, lite som en <noun>.',
    'Tror nog att <name> och <name> är samma person, och egentligen inte en person, mer en <noun>.',
    'Petrus-gropen, nu!'
];

const replaceName = (text: string, name: string) => 
    text.replace('<name>', name);

const replaceNoun = (text: string, noun: string) => 
    text.replace('<noun>', noun);

const containedNames = (text: string): string[] =>
    names.filter((name) => text.includes(name.toLowerCase()));

const getRandomElement = (arr: any[]) =>
    arr[Math.floor(Math.random() * arr.length)];

const randomEmoji = () => 
    emojis.random({n: 1, nogroup: 'Flags,Symbols'})[0];

const replaceAll = (text: string, name: string, noun: string) => {
    if(!text.includes('<')) {
        return text;
    }
    name = name != null ? name : getRandomElement(names);
    noun = noun != null ? noun : getRandomElement(nouns);
    return replaceAll(replaceName(replaceNoun(text, noun), name), null, null);
}


export class FrankBot extends ActivityHandler {
    constructor() {
        super();
        this.onMessage(async (context, next) => {
            const message = context.activity.text.toLowerCase();
            const words = message.replace(/\?|!/g, '').split(' ');
            if (message.includes('ritrovo')) {
                const replyText = 'Ritrovo har pizza, pasta, sallader, mackor och bra kaffe, ' +
                    'samma som alltid.';
                await this.sendMessage(context, replyText);
            } else if (message.includes('fika')) {
                await this.sendReply(context, message, fikaReplies);
            }  else if (message.includes('phils') || message.includes("phil's")) {
                const replyText =
                    'De serverar alltid handburgare, man äter dem med händerna.';
                await this.sendMessage(context, replyText);
            } else if (message.includes('lunch') && words.length < 6) {
                const offset = message.includes('imorgon') ? 1 : 0;
                const isToday = offset == 0;
                const lunchText = await this.fetchLunch(offset);
                const date = new Date();
                date.setDate(date.getDate() + offset);
                const dayOfWeek = date.toLocaleDateString('sv-SE', { weekday: 'long' });
                const dayWord = isToday ? 'Idag' : 'Imorgon';
                const replyText = `${dayWord} (${dayOfWeek}) så serveras det:\n\n` +
                    lunchText;
                await this.sendMessage(context, replyText);
            } else if (message.includes('team')) {
                const replyText =
                    'Om du frågar mig så är det definitivt mest effektivt att splitta teamet på ' +
                    'back-end och front-end.';
                await this.sendReply(context, message, [replyText]);
            } else if (message.includes('var')) {
                await this.sendReply(context, message, whereReplies);
            } else if (message.includes('när')) {
                await this.sendReply(context, message, whenReplies);
            } else if (message.includes('vem')) {
                await this.sendReply(context, message, nameReplies);
            } else if (message.includes('?')) {
                await this.sendReply(context, message, yesNoReplies);
            } else {
                await this.sendReply(context, message, factReplies);
            }
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const isFrank = context.activity.membersAdded
                .filter((m) => m.name === 'Frank').length < 0;
            const welcomeText =
                `Goddagens, jag heter Frank och kan ` +
                `svara på vad Sabis serverar för lunch idag genom att ` +
                `du frågar mig "Lunch?".`;
            if (isFrank) {
                await this.sendMessage(context, welcomeText);
            }
            await next();
        });
    }

    private sendMessage(context: TurnContext, reply: string) {
        return context.sendActivity(MessageFactory.text(reply, reply));
    }

    private sendReply(context: TurnContext, message: string, replyList: string[]) {
        const mentionedNames = containedNames(message);
        const name = mentionedNames.length > 0 ? mentionedNames[0] : getRandomElement(names);
        const text = replaceAll(getRandomElement(replyList), name, null);
        const reply = `${text} ${randomEmoji()} `;
        return context.sendActivity(MessageFactory.text(reply, reply));
    }

    fetchLunch(offset: number = 0): Promise<any> {
        const parsed = AxiosInstance.get(url)
            .then(
                response => {
                    const liDays = parse(response.data, {
                        voidTag: {
                            tags: ['link', 'meta', 'head', 'img', 'script',
                                'figure', 'p', 'h1', 'h2', 'footer'],
                        }
                    }).querySelector('.menu-block__days')
                        .getElementsByTagName('li')
                        .map((e) => e.getElementsByTagName('ul'))
                        .filter((e) => e.length > 0)
                        .map((e) => e[0].getElementsByTagName('li'));
                    // Starts counting on Sunday.
                    const dayOfWeek = new Date().getDay();
                    if (dayOfWeek + offset == 0 || dayOfWeek + offset == 6) {
                        return 'Gå hem, det är helg.';
                    }
                    const dayData = liDays[dayOfWeek - 1 + offset];
                    const dishes = dayData.map((e) => {
                        const dish = e.getElementsByTagName('p')[0].innerText;
                        const icons = e.getElementsByTagName('svg')
                            .map((svg) => iconMap[svg.classNames.split(' ')
                                .filter(
                                    (iconName) => iconName !== 'icon'
                                ).join()])
                            .join(' ');
                        return '* ' + dish + ' ' + icons;
                    }).join('\n');
                    return dishes;
                }
            )
            .catch(
                () => new Promise((_) => 'Något gick åt fanders.')
            );
        return parsed;
    }
}
