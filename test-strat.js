
/**
 * Initialize your strategy
 * - define buy and sell conditions (indicators, candlestick patterns, news analysis, profit percent, etc)
 * 
 * Bot session settings
 * - balance allocation (percentage or total dollar value amount)
 * - max number of trades at any given time
 * - if the bot is doing margin trading
 * - max margin trade loan allocation percent
 * - starting side (ex: buy)
 * - backtesting settings (starting balance, window of time) - if backtest session
 * - base currency (ex: USDT) - currency that's held in balance
 * - target currency (ex: BTC) - currency that's being traded
 * 
 * Bot session parameters
 * Bot session parameters will be dynamic to each strategy. More or less they are key-value pairs that get passed into the strategy.
 * 
 * Running a strategy
 * It will be sandboxed and safely eval'd with the only scope/context being strategy and session class instances.
 */

// the bot session parameters required for the strategy
const buyRSIInput      = input.get('BUY_RSI_INPUT');
const buyRSIThreshold  = input.get('BUY_RSI_THRESHOLD');
const buyCandle        = input.get('BUY_CANDLE');
const sellRSIInput     = input.get('SELL_RSI_INPUT');
const sellRSIThreshold = input.get('SELL_RSI_THRESHOLD');
const profitThreshold  = input.get('PROFIT_PERCENT_THRESHOLD');

// defining the buy and sell conditions for the strategy
strategy
    .buy(signalQuery => {
        signalQuery
            .whereIndicator('RSI', {periods: buyRSIInput}, '>', buyRSIThreshold)
            .whereCandle(buyCandle)
            .whereProfit('>', profitThreshold); // profit checks only apply when not initial trade
    })
    .sell(signalQuery => {
        signalQuery
            .whereIndicator('RSI', {periods: sellRSIInput}, '>', sellRSIThreshold)
            .whereProfit('>', profitThreshold); // profit checks only apply when not initial trade
    });