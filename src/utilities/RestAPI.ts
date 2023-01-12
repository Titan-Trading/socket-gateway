import RestClient from './RestClient';

/**
 * Get data from the REST API
 */

export default class RestAPI extends RestClient
{
    /**
     * Get API connect token
     * @returns 
     */
    async getAPIConnectToken()
    {
        const res = await this.client.post(this.baseURL + '/api-connect-tokens');

        if(!res || !res.data) {
            return null;
        }

        return res.data.access_token;
    }

    /**
     * Get exchanges
     */
    async getExchanges()
    {
        const res = await this.client.get(this.baseURL + '/admin/trading/exchanges');

        if(!res || !res.data) {
            return [];
        }

        return res.data;
    }

    /**
     * Get used ticket symbols (all exchanges)
     */
    async getTickerSymbols(exchangeId: number)
    {
        const res = await this.client.get(this.baseURL + '/admin/trading/symbols', {params: {exchange_id: exchangeId}});

        if(!res || !res.data) {
            return [];
        }

        return res.data;
    }

    /**
     * Get used ticket symbols (all exchanges)
     */
    async getSymbol(symbolId: number)
    {
        const res = await this.client.get(this.baseURL + '/admin/trading/symbols/' + symbolId);

        if(!res || !res.data) {
            return null;
        }

        return res.data;
    }

    /**
     * Get market data for a given exchange, symbol, interval for a given start and end date
     * @param exchangeId 
     * @param symbolId 
     * @param interval 
     * @param fromDate 
     * @param toDate 
     * @returns 
     */
    async getMarketData(exchangeId: number, symbolName: string, interval: string, fromDate: string, toDate: string = null, page:number = 1)
    {
        const res = await this.client.get(this.baseURL + '/admin/trading/data', {params: {
            exchange_id: exchangeId,
            symbol:      symbolName,
            interval,
            from_date:   fromDate,
            to_date:     toDate,

        }});

        // if(!res || !res.data) {
        //     return [];
        // }

        return res.data;
    }

    /**
     * Get indicators
     */
    async getIndicators()
    {
        const res = await this.client.get(this.baseURL + '/admin/trading/indicators');

        if(!res || !res.data) {
            return [];
        }

        return res.data;
    }

    /**
     * Get indicator by id
     */
    async getIndicator(indicatorId: number)
    {
        const res = await this.client.get(this.baseURL + '/admin/trading/indicators/' + indicatorId);

        if(!res || !res.data) {
            return null;
        }

        return res.data;
    }

    /**
     * Update indicator
     */
    async updateIndicator(id: Number, data: any)
    {
        const res = await this.client.put(this.baseURL + '/admin/trading/indicators/' + id, data);

        if(!res || !res.data) {
            return [];
        }

        return res.data;
    }

    /**
     * Get all active bot sessions
     */
    async getIndicatorTests()
    {
        const res = await this.client.get(this.baseURL + '/admin/trading/indicators/tests');

        if(!res || !res.data) {
            return [];
        }

        return res.data;
    }

    /**
     * Update bot session
     */
    async updateIndicatorTest(indicatorId: Number, id: Number, data: any)
    {
        const res = await this.client.put(this.baseURL + '/admin/trading/indicators/' + indicatorId + '/tests/' + id, data);

        if(!res || !res.data) {
            return [];
        }

        return res.data;
    }

    /**
     * Get connection exchanges/exchange accounts
     */
    async getExchangeAccounts(exchangeId: number|null = null)
    {
        const res = await this.client.get(this.baseURL + '/admin/trading/exchange-accounts', exchangeId ? {params: {exchange_id: exchangeId}} : {});
 
        if(!res || !res.data) {
            return [];
        }
 
        return res.data;
    }

    /**
     * Get connection exchange/exchange account by id
     */
    async getExchangeAccount(exchangeAccountId: number)
    {
        const res = await this.client.get(this.baseURL + '/admin/trading/exchange-accounts/' + exchangeAccountId);

        if(!res || !res.data) {
            return null;
        }

        return res.data;
    }

    /**
     * Get bots
     */
    async getBots()
    {
        const res = await this.client.get(this.baseURL + '/admin/trading/bots');

        if(!res || !res.data) {
            return [];
        }

        return res.data;
    }

    /**
     * Get bot by id
     */
    async getBot(botId: number)
    {
        const res = await this.client.get(this.baseURL + '/admin/trading/bots/' + botId);

        if(!res || !res.data) {
            return null;
        }

        return res.data;
    }

    /**
     * Update bot
     */
    async updateBot(id: Number, data: any)
    {
        const res = await this.client.put(this.baseURL + '/admin/trading/bots/' + id, data);

        if(!res || !res.data) {
            return [];
        }

        return res.data;
    }

    /**
     * Get all active bot sessions
     */
    async getBotSessions()
    {
        const res = await this.client.get(this.baseURL + '/admin/trading/bots/sessions');

        if(!res || !res.data) {
            return [];
        }

        return res.data;
    }

    /**
     * Get all active bot sessions
     */
    async getBotSession(botId: number, botSessionId: number)
    {
        const res = await this.client.get(this.baseURL + '/admin/trading/bots/' + botId + '/sessions/' + botSessionId);

        if(!res || !res.data) {
            return null;
        }

        return res.data;
    }

    /**
     * Update bot session
     */
    async updateBotSession(botId: Number, id: Number, data: any)
    {
        const res = await this.client.put(this.baseURL + '/admin/trading/bots/' + botId + '/sessions/' + id, data);
 
        if(!res || !res.data) {
            return [];
        }
 
        return res.data;
    }

    /**
     * Get all active bot sessions
     */
    async getConditionalTrades()
    {
        const res = await this.client.get(this.baseURL + '/admin/trading/conditional-trades');

        if(!res || !res.data) {
            return [];
        }

        return res.data;
    }

    /**
     * Update conditional trade
     */
    async updateConditionalTrade(id: Number, data: any)
    {
        const res = await this.client.put(this.baseURL + '/admin/trading/conditional-trades/' + id, data);
 
        if(!res || !res.data) {
            return [];
        }
 
        return res.data;
    }

    /**
     * Add order
     */
    async addOrder(data: any)
    {
        const res = await this.client.put(this.baseURL + '/admin/trading/orders', data);
 
        if(!res || !res.data) {
            return [];
        }
 
        return res.data;
    }

    /**
     * Update order
     */
    async updateOrder(id: Number, data: any)
    {
        const res = await this.client.put(this.baseURL + '/admin/trading/orders/' + id, data);
 
        if(!res || !res.data) {
            return [];
        }
 
        return res.data;
    }

    /**
     * Add order fill
     */
    async addOrderFill(id: Number, data: any)
    {
        const res = await this.client.put(this.baseURL + '/admin/trading/orders/' + id + '/fills', data);
 
        if(!res || !res.data) {
            return [];
        }
 
        return res.data;
    }
}