'use strict'
const smoozCandles = require('./smooz-candles')

class Plot {

    constructor (xScale, yScale) {
        this.xScale = xScale
        this.yScale = yScale

        this.candles = []
        this.smoozCandles = []

        this.wrapper

        this.pathBodiesUp
        this.pathBodiesDown
        this.pathWicksUp
        this.pathWicksDown
    }

    // –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
    //   WRAPPER
    // –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
    appendWrapper (container) {
        this.wrapper = container.append('g')
            .attr('class', 'plot')
            .attr('clip-path', 'url(#clip)')

        this.pathBodiesUp = this.wrapper.append('path')
                .attr('class', 'body up')
        this.pathBodiesDown = this.wrapper.append('path')
                .attr('class', 'body down')
        this.pathWicksUp = this.wrapper.append('path')
                .attr('class', 'wick up')
        this.pathWicksDown = this.wrapper.append('path')
                .attr('class', 'wick down')

        this.lastBody = this.wrapper.append('path')
        this.lastWick = this.wrapper.append('path')

        return this.wrapper
    }

    // –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
    //   DRAW
    // –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
    draw (candles, update = false) {
        if (!candles.length)
            return

        if (update || !this.candles.length
                   || candles.last.timestamp != this.candles.last.timestamp) {
            this.candles = [...candles]
            this.smoozCandles = smoozCandles(candles)
        }

        candles = [...this.smoozCandles]
        let lastCandle = candles.pop()

        let upCandles = candles.filter(x => x.direction === 'up')
        let downCandles = candles.filter(x => x.direction === 'down')

        this.pathBodiesUp
            .attr('d', this._getBodies(upCandles, 'up'))
        this.pathBodiesDown
            .attr('d', this._getBodies(downCandles, 'down'))
        this.pathWicksUp
            .attr('d', this._getWicks(upCandles, 'up'))
        this.pathWicksDown
            .attr('d', this._getWicks(downCandles, 'down'))

        this.lastBody
            .attr('d', this._getBodyString(
                lastCandle,
                lastCandle.direction,
                this._bodyWidth
            ))
            .attr('class', 'body ' + lastCandle.direction)
        this.lastWick
            .attr('d', this._getWickString(lastCandle))
            .attr('class', 'wick ' + lastCandle.direction)
    }

    // –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
    //   UPDATE LAST CANDLE
    // –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
    updateLast (candle) {
        let index = this.candles.lastIndex
        this.candles.last = candle

        this.smoozCandles = smoozCandles(
            this.candles,
            this.smoozCandles,
            index
        )

        let lastCandle = this.smoozCandles.last

        this.lastBody
            .attr('d', this._getBodyString(
                lastCandle,
                lastCandle.direction,
                this._bodyWidth
            ))
            .attr('class', 'body ' + lastCandle.direction)
        this.lastWick
            .attr('d', this._getWickString(lastCandle))
            .attr('class', 'wick ' + lastCandle.direction)
    }

    // –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
    //   INTERNAL METHODS
    // –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
    _getBodies (candles, direction) {
        let width = this._bodyWidth
        let string = ''

        for (let candle of candles) {
            string += this._getBodyString(candle, direction, width)
        }
        return string
    }

    _getBodyString(candle, direction, width) {
        let open = Math.round(this.yScale(candle.open))
        let close = Math.round(this.yScale(candle.close))
        let top, bottom

        if (direction === 'up')
            bottom = open,
            top = close
        else
            bottom = close,
            top = open

        let height = top - bottom
        let x = Math.round(this.xScale(candle.date)) - width / 2
        let y = top

        return 'M' + x + ',' + y
            + ' h' + width + 'v' + -height + 'h' + -width + 'z '
    }

    _getWicks (candles) {
        let string = ''

        for (let candle of candles) {
            string += this._getWickString(candle)
        }
        return string
    }

    _getWickString(candle) {
        let x = Math.round(this.xScale(candle.date))
        let y1 = Math.round(this.yScale(candle.high))
        let y2 = Math.round(this.yScale(candle.low))

        return 'M' + x + ',' + y1 + ' v' + (y2 - y1)
    }

    get _bodyWidth () {
        let width = this._zoomScale

        // Clamp width on high zoom out levels
             if (width < 0.8) width = 0
        else if (width < 1.5) width = 2
        else if (width < 3.0) width = 3

        return width
    }

    get _zoomScale () {
        return d3.zoomTransform(this.wrapper.node()).k
    }
}

module.exports = Plot
