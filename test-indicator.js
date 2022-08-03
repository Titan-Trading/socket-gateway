
/**
 * Initialize your indicator
 * - take some data and perform custom calculations
 */

const numOfPeriods = input.get('PERIODS');

indicator
    .periods(numOfPeriods) // previous candles needed to do calculation
    .calculate(periods => {
        // loop through all data to calculate the RSI
        let rsiValue = 0;

        periods.forEach(d => {
            rsiValue += d.close;
        });

        // return the current rsi value
        return rsiValue;
    })
    