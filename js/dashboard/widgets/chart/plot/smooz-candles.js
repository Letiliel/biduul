'use strict'

module.exports = smoozCandles

/**
 * Returns an array of smoothed candles.
 * (Based on heikin ashi candles, but keeps the real high & low)
 * */
function smoozCandles (
    candles,
    prevSmooz = [],     // If updating
    startIndex = 0,     // If updating
) {
    let newCandles = [...prevSmooz.slice(0, startIndex)]

    for (let i = startIndex; i < candles.length; i++) {
        let { open, close, high, low, date, volume } = candles[i]
        let last = newCandles[i - 1]

        let newOpen = (last)
            ? (last.open + last.close) / 2
            : (open + close) / 2
        let newClose = (open + close + high + low) / 4

        let newDirection = (newOpen <= newClose)
            ? 'up' : 'down'

        // Clamp new open to low/high
        newOpen = (newDirection === 'up')
            ? Math.max(newOpen, low)
            : Math.min(newOpen, high)

        // Keep last candle as standard candle (except direction)
        if (i === candles.length - 1) {
            newOpen = open
            newClose = close
        }

        newCandles[i] = {
            direction: newDirection,
            date: date,
            open: newOpen,
            close: newClose,
            high: high,
            low: low,
            volume: volume
        }

        // Adjust close of last candle, we don't want gaps
        if (last)
            last.close = (last.direction === 'up')
                ? Math.max(last.close, newOpen)
                : Math.min(last.close, newOpen)
    }
    return newCandles
}
