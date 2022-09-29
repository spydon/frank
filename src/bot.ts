import axios from 'axios';
import { ActivityHandler, MessageFactory } from 'botbuilder';
import { parse } from 'node-html-parser';

const url = 'https://www.sabis.se/restauranger-cafeer/vara-foretagsrestauranger/skandia/';
const AxiosInstance = axios.create();
const iconMap = {
    'icon--gluten': '🌾',
    'icon--lactose': '🥛',
    'icon--farmers-choice': '🧑‍🌾'
};

export class EchoBot extends ActivityHandler {
    constructor() {
        super();
        this.onMessage(async (context, next) => {
            const message = context.activity.text.toLowerCase();
            const words = message.replace(/\?|!/g, '').split(' ');
            if (message.includes('lunch') && words.length < 6) {
                const offset = message.includes('imorgon') ? 1 : 0;
                const isToday = offset == 0;
                const lunchText = await this.fetchLunch(offset);
                const date = new Date();
                date.setDate(date.getDate() + offset);
                const dayOfWeek = date.toLocaleDateString('sv-SE', { weekday: 'long' });
                const dayWord = isToday ? 'Idag' : 'Imorgon';
                const replyText = `${dayWord} (${dayOfWeek}) så serveras det:\n\n` +
                    lunchText;
                await context.sendActivity(
                    MessageFactory.text(replyText, replyText)
                );
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
                await context.sendActivity(
                    MessageFactory.text(welcomeText, welcomeText)
                );
            }
            await next();
        });
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
                    if (dayOfWeek == 0 || dayOfWeek == 6) {
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
