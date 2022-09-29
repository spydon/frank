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

const yesNoWords = [
    'Ja?', 'Nej.', 'Nja.', 'Säger du det så.', 'Är det inte dags för dig att jobba lite?', 'Absolut.',
    'Lugn nu.', 'Javisst!', 'Någon tycker säkert att det är så i alla fall.'
];

const getRandomElement = (arr: any[]) =>
    arr[Math.floor(Math.random() * arr.length)]


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
            } else {
                const replyText = `${getRandomElement(yesNoWords)} ${emojis.random({n: 1})[0]}`;
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
