'use strict'
const techan = require('techan')
const api = require('../../../apis/futures')
const trading = require('../trading')
const Plot = require('./plot/plot')

let margin = { top: 0, right: 55, bottom: 30, left: 55 }
let width = 960 - margin.left - margin.right
let height = 700 - margin.top - margin.bottom

let xScale = d3.scaleTime().range([0, width])
let yScale = d3.scaleSymlog().range([height, 0])

let zoom = d3.zoom().on('zoom', onZoom)

let xAxis = d3.axisBottom(xScale)

let yAxisLeft = d3.axisLeft(yScale)
        .tickFormat(d3.format('.2f'))

let yAxisRight = d3.axisRight(yScale)
        .tickFormat(d3.format('.2f'))

let xGridlines = d3.axisTop(xScale)
        .tickFormat('')
        .tickSize(-height)

let yGridlines = g => g.call(d3.axisLeft(yScale)
        .tickFormat('')
        .tickSize(-width)
        .tickValues(d3.scaleLinear().domain(yScale.domain()).ticks())
    )

let axisLabelBottom = techan.plot.axisannotation()
        .axis(xAxis)
        .orient('bottom')
        .format(d3.timeFormat('%-d/%-m/%Y %-H:%M:%S'))
        .width(94)
        .translate([0, height])

let axisLabelLeft = techan.plot.axisannotation()
        .axis(yAxisLeft)
        .orient('left')
        .format(d3.format(',.2f'))

let axisLabelRight = techan.plot.axisannotation()
        .axis(yAxisRight)
        .orient('right')
        .format(d3.format(',.2f'))
        .translate([width, 0])

let lines = techan.plot.supstance()
        .xScale(xScale)
        .yScale(yScale)
        .annotation([axisLabelLeft, axisLabelRight])

let orderLines = techan.plot.supstance()
        .xScale(xScale)
        .yScale(yScale)
        .annotation([axisLabelLeft, axisLabelRight])
        .on('drag', onDragOrder)
        .on('dragend', onDragOrderEnd)

let draftLines = techan.plot.supstance()
        .xScale(xScale)
        .yScale(yScale)
        .annotation([axisLabelLeft, axisLabelRight])
        .on('drag', onDragDraft)

let crosshair = techan.plot.crosshair()
        .xScale(xScale)
        .yScale(yScale)
        .xAnnotation(axisLabelBottom)
        .yAnnotation([axisLabelLeft, axisLabelRight])

let plot = new Plot(xScale, yScale)

// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
//   PREPARE SVG CONTAINERS
// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
let svg = d3.select('#chart').append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
    .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

svg.call(zoom)

svg.on('dblclick.zoom', null)
    .on('dblclick', function () {
        placeOrderDraft(yScale.invert(d3.mouse(this)[1]))
    })

let gClipPath = svg.append('clipPath')
        .attr('id', 'clip')
    .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height)

let gXGridlines = svg.append('g').class('x gridlines')
let gYGridlines = svg.append('g').class('y gridlines')

let gXAxis = svg.append('g').class('x axis bottom')
        .attr('transform', 'translate(0,' + height + ')')

let gYAxisLeft = svg.append('g').class('y axis left')
let gYAxisRight = svg.append('g').class('y axis right')
        .attr('transform', 'translate(' + width + ',0)')

let gPositionLine = svg.append('g').class('position-line')
let gLiquidationLine = svg.append('g').class('liquidation-line')
        .attr('clip-path', 'url(#clip)')
let gBidASkLines = svg.append('g').class('bid-ask-lines')
let gPriceLine = svg.append('g').class('price-line')

plot.appendWrapper(svg)
plot.appendWrapper(svg)

let gCrosshair = svg.append('g').class('crosshair')

let gOrderLines = svg.append('g').class('order-lines')
let gDraftLines = svg.append('g').class('draft-lines')

let gPositionLabel = svg.append('g').class('position-label')
        .attr('clip-path', 'url(#clip)')
let gOrderLabels = svg.append('g').class('order-labels')
        .attr('clip-path', 'url(#clip)')
let gDraftLabels = svg.append('g').class('draft-labels')
        .attr('clip-path', 'url(#clip)')

// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
//   LOAD DATA
// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
let candles = []
let priceLineData = []
let positionLineData = []
let bidAskLinesData = []
let liquidationLineData = []
let orderLinesData = []
let draftLinesData = []

let lastCandlesURL = 'https://fapi.binance.com/fapi/v1/klines?symbol=' + SYMBOL + '&limit=1500&interval=1m'

d3.json(lastCandlesURL)
    .then(jsonCandles => {
        candles = jsonCandles
            .map(d => {
                let date = new Date(+d[0])
                return {
                    date: date,
                    timestamp: date.getTime(),
                    direction: (+d[1] <= +d[4]) ? 'up' : 'down',
                    open: +d[1],
                    high: +d[2],
                    low: +d[3],
                    close: +d[4],
                    volume: +d[7]
                }
            })

        // Draw with initial data
        initDraw()
    })
    .catch(e => console.error(e)) // Fixme (load something on error)

// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
//   INIT DRAW
// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
function initDraw() {
    draw()
    // Right padding
    svg.call(zoom.translateBy, -100)
    // svg.call(zoom.translateBy, -200)
    // svg.call(zoom.scaleBy, 1.5)

    api.getPosition()
    api.getOpenOrders()

    // Event listeners
    events.on('api.priceUpdate', updatePrice)
    events.on('api.positionUpdate', updatePosition)
    events.on('api.orderUpdate', updateOpenOrders)
    events.on('api.bidAskUpdate', updateBidAsk)
    events.on('liquidation.update', onLiquidationUpdate)
    events.on('trading.qtyUpdate', onTradingQtyUpdate)

    streamLastCandle()
}

// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
//   RENDER CHART
// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
function draw() {
    let data = candles.slice(-300, candles.length)

    let xdomain = [data[0].date, data.last.date]
    let ydomain = [d3.min(data, d => d.low), d3.max(data, d => d.high)]

    // Padding y axis
    ydomain[0] -= 50
    ydomain[1] += 50

    xScale.domain(xdomain)
    yScale.domain(ydomain)

    gXAxis.call(xAxis)
    gYAxisLeft.call(yAxisLeft
        .tickValues(d3.scaleLinear().domain(yScale.domain()).ticks())
    )
    gYAxisRight.call(yAxisRight
        .tickValues(d3.scaleLinear().domain(yScale.domain()).ticks())
    )

    gXGridlines.call(xGridlines)
    gYGridlines.call(yGridlines)

    gPriceLine.datum(priceLineData).call(lines)
    gPositionLine.datum(positionLineData).call(lines)
    gBidASkLines.datum(bidAskLinesData).call(lines)
    gLiquidationLine.datum(liquidationLineData).call(lines)
    gOrderLines.datum(orderLinesData).call(orderLines).call(orderLines.drag)
    gDraftLines.datum(draftLinesData).call(draftLines).call(draftLines.drag)

    gPositionLabel.call(lineLabel, positionLineData)
    gOrderLabels.call(lineLabel, orderLinesData, 'order')
    gDraftLabels.call(lineLabel, draftLinesData, 'draft')

    gCrosshair.call(crosshair)

    // plot.draw(data)
    plot.draw(candles)

    // Color lines based on market side
    gPositionLine.selectAll('.position-line > g')
        .attr('data-side', d => d.side)
    gOrderLines.selectAll('.order-lines > g')
        .attr('data-side', d => d.side)
    gDraftLines.selectAll('.draft-lines > g')
        .attr('data-side', d => d.side)
}

// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
//   DATA UPDATE CALLBACKS
// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
function updatePrice (price) {
    priceLineData = [{value: price}]
    gPriceLine.datum(priceLineData).call(lines)
}

function updatePosition (positions) {
    let position = positions.filter(x => x.symbol === SYMBOL)[0]
    let i = liquidationLineData.findIndex(x => x.type === 'real')

    if (position.qty && position.liquidation) {
        // Add new
        if (i >= 0)
            liquidationLineData[i].value = position.liquidation
        else
            liquidationLineData.push({ value: position.liquidation, type: 'real' })
    }
    else
        // Remove
        if (i >= 0) liquidationLineData.splice(i, 1)

    positionLineData = (position.qty) ? [position] : []
    draw()
}

function updateOpenOrders (orders) {
    orderLinesData = orders
    draw()
}

function updateBidAsk (data) {
    if (bidAskLinesData[0]) {
        if (bidAskLinesData[0].value === data.a
            && bidAskLinesData[1].value === data.b)
            return
    }
    bidAskLinesData = [{value: data.a}, {value: data.b}]

    gBidASkLines.datum(bidAskLinesData).call(lines)
}

// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
//   STREAM CANDLES (WEBSOCKET)
// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
function streamLastCandle () {
    let stream = new WebSocket(api.wsURL + '@kline_1m')

    stream.onmessage = event => {
        let d = JSON.parse(event.data).k

        let date = new Date(d.t)
        let direction = (parseFloat(d.o) <= parseFloat(d.c))
            ? 'up' : 'down'

        let candle = {
                date: date,
                timestamp: date.getTime(),
                direction: direction,
                open: parseFloat(d.o),
                high: parseFloat(d.h),
                low: parseFloat(d.l),
                close: parseFloat(d.c),
                volume: parseFloat(d.q) }

        let isSameCandle = candle.timestamp === candles.last.timestamp

        if (isSameCandle) {
            candles.last = candle
            plot.updateLast(candle)
        } else {
            candles.push(candle)
            draw()
            // Pan chart
            svg.call(zoom.translateBy, 0) // Ehh... ¯\_(°~°)_/¯
        }
    }
}

// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
//   CHART ITEM GENERATORS
// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
function lineLabel (selection, data, type) {
    selection.selectAll('g')
        .data(data)
        .join(
            // Add label at y = price
            enter => enter.append('g').call(g => {
                let rect = g.append('rect')
                    .attr('x', width - 80)
                    .attr('y', d => yScale(d.value) - 10)

                g.append('text')
                    .text(d => +d.qty)
                    .attr('x', width - 75)
                    .attr('y', d => yScale(d.value) + 3)

                g.attr('data-side', d => d.side)

                // Order
                if (type === 'order')
                    rect.on('click', d =>  api.cancelOrder(d.id))
                // Draft
                if (type === 'draft') {
                    rect.on('click', (d, i) => draftToOrder(d, i))
                }
            }),
            // Update y
            update => update.call(g => {
                let rect = g.select('rect')
                    .attr('y', d => yScale(d.value) - 10)
                g.select('text')
                    .attr('y', d => yScale(d.value) + 3)
                    .text(d => +d.qty)
                g.attr('data-side', d => d.side)

                if (type === 'draft') {
                    rect.on('click', (d, i) => {
                        draftToOrder(d, i)
                    })
                }
            })
        )
    return selection
}

// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
//   EVENT HANDLERS
// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
function placeOrderDraft (price) {
    price = +(price.toFixed(2))
    let lastPrice = (api.lastPrice)
            ? api.lastPrice
            : candles.last.close
    let side = (price <= lastPrice) ? 'buy' : 'sell'
    let qty = d3.select('#' + side + '-qty').property('value')

    let data = { value: price, qty: Number(qty), side: side }
    draftLinesData = [data]

    onDragDraft(data) // Wobbly coding <(°v°)<
    draw()
}

function onDragDraft (d) {
    let price = +(d.value.toFixed(2))
    let lastPrice = (api.lastPrice)
            ? api.lastPrice
            : candles.last.close
    let qty = d3.select('#' + d.side + '-qty').property('value')

    draftLinesData[0].value = price
    draftLinesData[0].qty = Number(qty)

    events.emit('chart.draftOrderMoved', d.side, price, qty)

    // Redraw
    gDraftLabels.call(lineLabel, draftLinesData, 'draft')
}

function draftToOrder (d, i) {
    draftLinesData.splice(i, 1)

    events.emit('chart.draftOrderMoved', d.side, null, null)

    draw()

    let order = (d.side === 'buy')
        ? trading.onBuy
        : trading.onSell

    order('limit')
}

function onTradingQtyUpdate (side, qty) {
    let draft = draftLinesData[0]
    // Update qty on order draft line
    if (draft && side === draft.side) {
        draft.qty = +qty
        draw()
    }
}

function onDragOrder (d) {
    let currentOrder = orderLinesData.filter(x => x.id === d.id)[0]
    if (!currentOrder || currentOrder.price === d.value)
        return
    gOrderLabels.call(lineLabel, orderLinesData, 'order')
}
function onDragOrderEnd (d) {
    /* Delete order, recreate at new price */
    let currentOrder = orderLinesData.filter(x => x.id === d.id)[0]
    if (!currentOrder || currentOrder.price === d.value)
        return

    api.cancelOrder(d.id)

    let order = (d.side === 'buy')
        ? api.lib.futuresBuy
        : api.lib.futuresSell

    order(d.symbol, d.qty, d.value.toFixed(2), {
            'reduceOnly': d.reduceOnly,
            'timeInForce': d.timeInForce
        })
        .catch(error => console.error(error))
}

function onLiquidationUpdate (price, side) {
    let index = liquidationLineData.findIndex(x => x.side === side)

    if (!price && index >= 0)
        // Remove
        liquidationLineData.splice(index, 1)
    else if (price && index >= 0)
        // Update
        liquidationLineData[index].value = price
    else if (price)
        // Add
        liquidationLineData.push({ value: price, type: 'draft', side: side })

    //Redraw
    gLiquidationLine.datum(liquidationLineData).call(lines)
    // Set style on liquidation lines
    gLiquidationLine.selectAll('.liquidation-line > g')
        .attr('data-type', d => d.type)
}

function onZoom() {
    let transform = d3.event.transform
    let scaledX = transform.rescaleX(xScale)

    xAxis.scale(scaledX)
    xGridlines.scale(scaledX)
    plot.xScale = scaledX

    // let scaledY = transform.rescaleY(yScale)
    // plot.yScale = scaledY
    draw()
}
