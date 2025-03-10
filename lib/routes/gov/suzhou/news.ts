import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';
import InvalidParameterError from '@/errors/types/invalid-parameter';

export const route: Route = {
    path: '/suzhou/news/:uid',
    categories: ['government'],
    example: '/gov/suzhou/news/news',
    parameters: { uid: '栏目名' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['www.suzhou.gov.cn/szsrmzf/:uid/nav_list.shtml'],
        },
    ],
    name: '政府新闻',
    maintainers: ['EsuRt', 'luyuhuang'],
    handler,
    description: `| 新闻栏目名 |       :uid       |
| :--------: | :--------------: |
|  苏州要闻  |   news 或 szyw   |
|  区县快讯  | district 或 qxkx |
|  部门动态  |       bmdt       |
|  新闻视频  |       xwsp       |
|  政务公告  |       zwgg       |
|  便民公告  |       mszx       |
|  民生资讯  |       bmzx       |

| 热点专题栏目名 |  :uid  |
| :------------: | :----: |
|    热点专题    |  rdzt  |
|   市本级专题   |  sbjzt |
|  最新热点专题  | zxrdzt |
|    往期专题    |  wqzt  |
|    区县专题    |  qxzt  |

::: tip
  **热点专题**栏目包含**市本级专题**和**区县专题**

  **市本级专题**栏目包含**最新热点专题**和**往期专题**

  如需订阅完整的热点专题，仅需订阅 **热点专题**\`rdzt\` 一项即可。
:::`,
};

async function handler(ctx) {
    const rootUrl = 'https://www.suzhou.gov.cn';
    const uid = ctx.req.param('uid');
    let url = '';
    let title = '';
    let apiUrl = '';
    let items = [];
    switch (uid) {
        case 'szyw':
        case 'news':
            apiUrl = `${rootUrl}/szinf/info/getInfoCommon/?pagesize=15&currpage=1&channelid=5057aeffb1a84a7e8aeded87728da48c`;
            url = `${rootUrl}/szsrmzf/szyw/nav_list.shtml`;
            title = '苏州市政府 - 苏州要闻';
            break;
        case 'qxkx':
        case 'district':
            apiUrl = `${rootUrl}/szinf/info/getInfoCommon/?pagesize=15&currpage=1&channelid=75c636ea0efb487ea7e479e3cc0ff3e5`;
            url = `${rootUrl}/szsrmzf/qxkx/nav_list.shtml`;
            title = '苏州市政府 - 区县快讯';
            break;
        case 'bmdt':
            apiUrl = `${rootUrl}/szinf/info/getInfoCommon/?pagesize=15&currpage=1&channelid=b3d097e3eb79421f88439ea381ce33c3`;
            url = `${rootUrl}/szsrmzf/bmdt/nav_list.shtml`;
            title = '苏州市政府 - 部门动态';
            break;
        case 'xwsp':
            apiUrl = `${rootUrl}/szinf/info/getInfoCommon/?pagesize=15&currpage=1&channelid=507980d214c943ebb0a70853ec94b12e`;
            url = `${rootUrl}/szsrmzf/xwsp/nav_list.shtml`;
            title = '苏州市政府 - 新闻视频';
            break;
        case 'rdzt':
            url = `${rootUrl}/szsrmzf/rdzt/nav_list.shtml`;
            title = '苏州市政府 - 热点专题';
            break;
        case 'sbjzt':
            url = `${rootUrl}/szsrmzf/sbjzt/nav_list.shtml`;
            title = '苏州市政府 - 市本级专题';
            break;
        case 'zxrdzt':
            url = `${rootUrl}/szsrmzf/zxrdzt/nav_list.shtml`;
            title = '苏州市政府 - 最新热点专题';
            break;
        case 'wqzt':
            url = `${rootUrl}/szsrmzf/wqzt/nav_list.shtml`;
            title = '苏州市政府 - 往期专题';
            break;
        case 'qxzt':
            url = `${rootUrl}/szsrmzf/qxzt/nav_list.shtml`;
            title = '苏州市政府 - 区县专题';
            break;
        case 'zwgg':
            apiUrl = `${rootUrl}/szinf/info/getInfoCommon/?pagesize=15&currpage=1&channelid=260915178a1f4c4fac44c4bf6378c9b0`;
            url = `${rootUrl}/szsrmzf/zwgg/nav_list.shtml`;
            title = '苏州市政府 - 政务公告';
            break;
        case 'mszx':
            apiUrl = `${rootUrl}/szinf/info/getInfoCommon/?pagesize=15&currpage=1&channelid=dc60acecb0be46b89d42272dcb8bd32b`;
            url = `${rootUrl}/szsrmzf/mszx/nav_list.shtml`;
            title = '苏州市政府 - 便民公告';
            break;
        case 'bmzx':
            apiUrl = `${rootUrl}/szinf/info/getInfoCommon/?pagesize=15&currpage=1&channelid=b015bfa5e5514cc9a26cd9f956ef8e69`;
            url = `${rootUrl}/szsrmzf/bmzx/bmzx_list.shtml`;
            title = '苏州市政府 - 民生资讯';
            break;
        default:
            throw new InvalidParameterError('pattern not matched');
    }
    if (apiUrl) {
        const response = await got(apiUrl);
        const infoList = response.data.infolist.map((item) => ({
            title: item.title,
            link: item.link.startsWith('http') ? item.link : new URL(item.link, rootUrl).href,
            pubDate: timezone(parseDate(item.pubtime, 'YYYY-MM-DD HH:mm:ss'), 8),
        }));

        items = await Promise.all(
            infoList.map((item) =>
                // 获取全文
                cache.tryGet(item.link, async () => {
                    const response = await got(item.link);
                    const $ = load(response.data);
                    item.description = $('ucapcontent').html();

                    return item;
                })
            )
        );
    } else {
        const response = await got(url);

        const $ = load(response.data);
        items = $('ul.infolist li')
            .toArray()
            .map((item) => {
                item = $(item);
                const a = item.find('a');
                return {
                    title: a.attr('title'),
                    link: new URL(a.attr('href'), rootUrl).href,
                    pubDate: timezone(parseDate(item.find('.time').text(), 'YYYY-MM-DD'), 8),
                };
            });
    }

    return {
        title,
        link: url,
        item: items,
    };
}
