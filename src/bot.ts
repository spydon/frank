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
    'Så sant som att <noun> är en delikatess för <name>.'
];

const nameReplies = [
    'Definitivt <name>.', 'Man skulle kunna tro att det är <name> som ligger bakom alltid.',
    'Den vise <name>, som jag brukar säga.', '<name> =', 'Ole dole doff <name>.',
    '<name> kommer en vacker dag att resa på en <noun> till kontoret.',
    'Vad det blir för lunch? <name> kommer i alla fall att äta en <noun>.'
]

const names = [
    'Lukas', 'Jörgen', 'Simon', 'UX-Jörgen', 'Abdi', 'Teddy', 'Jocke', 'Frida', 'Lars', 'Tor',
    'Fredrik', 'Tobias', 'Petrus', 'Johan', 'Anders', 'Rickard', 'John', 'Johannes'
];

// Substantiv (en)
const nouns = [
    'elefant', 'get', 'gås', 'fiskmås', 'hummer', 'hamster', 'gospelkör', 'helikopter',
    'valross', 'stol', 'kaviartub', 'lampa', 'kreditkort', 'mobil', 'flygande matta',
    'båt'
]

const replaceName = (text: string, name: string) => 
    text.replace('<name>', name);

const replaceNoun = (text: string, noun: string) => 
    text.replace('<noun>', noun);

const containedNames = (text: string): string[] =>
    names.filter((name) => text.includes(name.toLowerCase()));

const getRandomElement = (arr: any[]) =>
    arr[Math.floor(Math.random() * arr.length)];

const randomEmoji = () => 
    emojis.random({n: 1, nogroup: 'Flags'})[0];

const replaceAll = (text: string, name: string, noun: string) => {
    name = name != null ? name : getRandomElement(names);
    noun = noun != null ? noun : getRandomElement(nouns);
    return replaceName(replaceNoun(text, noun), name);
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
                const replyText =
                    'Fikapauser är att rekommendera, för mycket kod såsar ihop hjärnkontoret.';
                await this.sendMessage(context, replyText);
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
                    'Om du frågar mig så är det definitivt mest effektivt att splitta teamet på' +
                    'back-end och front-end.';
                await this.sendMessage(context, replyText);
            } else if (message.includes('vem') || containedNames.length > 0) {
                const mentionedNames = containedNames(message);
                const name = mentionedNames.length > 0 ? mentionedNames[0] : null;
                const text = replaceAll(getRandomElement(nameReplies), name, null);
                const replyText = `${text} ${randomEmoji()}`;
                await this.sendMessage(context, replyText);
            } else if (message.includes('?')) {
                const mentionedNames = containedNames(message);
                const name = mentionedNames.length > 0 ? mentionedNames[0] : getRandomElement(names);
                const text = replaceAll(getRandomElement(yesNoReplies), name, null);
                const replyText = `${text} ${randomEmoji()}`;
                await this.sendMessage(context, replyText);
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

    private sendMessage(context: TurnContext, message: string) {
        return context.sendActivity(
            MessageFactory.text(message, message)
        );
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
